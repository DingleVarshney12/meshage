import { randomBytes, createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import { User } from "../database/entities/user.entity";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { DataSource, IsNull, MoreThan } from "typeorm";
import { RefreshToken } from "../database/entities/refresh-token.entity";
import { LoginDto } from "./dto/login.dto";
import {
  AuthAccount,
  AuthProvider,
} from "../database/entities/auth-account.entity";
import {
  AuthToken,
  AuthTokenPurpose,
} from "../database/entities/auth-token.entity";
import { MailService } from "../mail/mail.service";
import { ResendVerificationDto } from "./dto/resend-verification.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { SignupDto } from "./dto/signup.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { GoogleAuthService } from "./google-auth.service";
import { GoogleAuthDto } from "./dto/google-auth.dto";
import { SupabaseStorageService } from "../infrastructure/supabase-storage.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly storageService: SupabaseStorageService,
  ) {}

  private async createSessionTokens(userId: string) {
    const accessToken = await this.jwtService.signAsync({ sub: userId });

    const refreshToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(refreshToken).digest("hex");

    await this.dataSource.getRepository(RefreshToken).save({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken };
  }

  async signup(signupDto: SignupDto) {
    if (Buffer.byteLength(signupDto.password, "utf8") > 72) {
      throw new BadRequestException(
        "Password must not exceed 72 bytes when encoded as UTF-8.",
      );
    }

    const passwordHash = await hash(signupDto.password, 12);

    const rawVerificationToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256")
      .update(rawVerificationToken)
      .digest("hex");

    try {
      const user = await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(User);
        const authAccounts = manager.getRepository(AuthAccount);
        const authTokens = manager.getRepository(AuthToken);

        const emailAlreadyUsed = await users.findOneBy({
          email: signupDto.email,
        });
        const usernameAlreadyUsed = await users.findOneBy({
          username: signupDto.username,
        });

        if (emailAlreadyUsed || usernameAlreadyUsed) {
          throw new ConflictException("Email or username is already in use.");
        }

        const newUser = users.create({
          email: signupDto.email,
          username: signupDto.username,
          displayName: signupDto.displayName,
        });

        const savedUser = await users.save(newUser);

        await authAccounts.save(
          authAccounts.create({
            userId: savedUser.id,
            provider: AuthProvider.EMAIL,
            providerUserId: signupDto.email,
            passwordHash,
          }),
        );

        await authTokens.save(
          authTokens.create({
            userId: savedUser.id,
            purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
            tokenHash,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          }),
        );

        return savedUser;
      });
      await this.mailService.sendVerificationEmail(
        user.email,
        rawVerificationToken,
      );
      return {
        message: "Account created. Email verification is required.",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
        },
      };
    } catch (error) {
      const databaseError = error as {
        driverError?: { code?: string };
      };

      if (databaseError.driverError?.code === "23505") {
        throw new ConflictException("Email or username is already in use.");
      }

      throw error;
    }
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const tokenHash = createHash("sha256")
      .update(verifyEmailDto.token)
      .digest("hex");

    return this.dataSource.transaction(async (manager) => {
      const authTokens = manager.getRepository(AuthToken);

      const authToken = await authTokens.findOne({
        where: {
          tokenHash,
          purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
        },
        lock: { mode: "pessimistic_write" },
      });

      const now = new Date();

      if (!authToken || authToken.consumedAt || authToken.expiresAt <= now) {
        throw new BadRequestException(
          "Verification link is invalid or expired.",
        );
      }

      await manager.getRepository(User).update(authToken.userId, {
        emailVerifiedAt: now,
      });

      authToken.consumedAt = now;
      await authTokens.save(authToken);

      return { message: "Email verified. You can now sign in." };
    });
  }

  async resendVerificationEmail(dto: ResendVerificationDto) {
    const now = new Date();
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    const recipient = await this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const tokens = manager.getRepository(AuthToken);

      const user = await users.findOne({
        where: { email: dto.email },
        lock: { mode: "pessimistic_write" },
      });

      if (!user || user.emailVerifiedAt) {
        return null;
      }

      const recentToken = await tokens.findOne({
        where: {
          userId: user.id,
          purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
          consumedAt: IsNull(),
          createdAt: MoreThan(new Date(now.getTime() - 60_000)),
        },
      });

      if (recentToken) {
        return null;
      }

      await tokens.update(
        {
          userId: user.id,
          purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
          consumedAt: IsNull(),
        },
        { consumedAt: now },
      );

      await tokens.save(
        tokens.create({
          userId: user.id,
          purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
          tokenHash,
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        }),
      );

      return user.email;
    });

    if (recipient) {
      try {
        await this.mailService.sendVerificationEmail(recipient, rawToken);
      } catch {
        await this.dataSource
          .getRepository(AuthToken)
          .update({ tokenHash }, { consumedAt: new Date() });

        this.logger.error("Verification email delivery failed.");
      }
    }

    return {
      message:
        "If the account exists and needs verification, an email will be sent shortly.",
    };
  }

  async login(dto: LoginDto) {
    if (Buffer.byteLength(dto.password, "utf8") > 72) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const user = await this.dataSource
      .getRepository(User)
      .findOneBy({ email: dto.email });

    if (!user || !user.emailVerifiedAt) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const authAccount = await this.dataSource
      .getRepository(AuthAccount)
      .findOneBy({
        userId: user.id,
        provider: AuthProvider.EMAIL,
        providerUserId: user.email,
      });

    if (
      !authAccount?.passwordHash ||
      !(await compare(dto.password, authAccount.passwordHash))
    ) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const tokens = await this.createSessionTokens(user.id);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
      },
    };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token is invalid or expired.");
    }

    const oldTokenHash = createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    return this.dataSource.transaction(async (manager) => {
      const refreshTokens = manager.getRepository(RefreshToken);

      const storedToken = await refreshTokens.findOne({
        where: { tokenHash: oldTokenHash },
        lock: { mode: "pessimistic_write" },
      });

      const now = new Date();

      if (
        !storedToken ||
        storedToken.revokedAt ||
        storedToken.expiresAt <= now
      ) {
        throw new UnauthorizedException("Refresh token is invalid or expired.");
      }

      storedToken.revokedAt = now;
      await refreshTokens.save(storedToken);

      const newRefreshToken = randomBytes(32).toString("base64url");
      const newTokenHash = createHash("sha256")
        .update(newRefreshToken)
        .digest("hex");

      await refreshTokens.save(
        refreshTokens.create({
          userId: storedToken.userId,
          tokenHash: newTokenHash,
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        }),
      );

      const accessToken = await this.jwtService.signAsync({
        sub: storedToken.userId,
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    });
  }

  async getCurrentUser(userId: string) {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        avatarStoragePath: true,
        profileVisibility: true,
        lastSeenAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const avatarUrl = user.avatarStoragePath
      ? await this.storageService.createSignedUrl(user.avatarStoragePath)
      : (user.avatarUrl ?? null);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio ?? null,
      avatarUrl,
      profileVisibility: user.profileVisibility,
      lastSeenAt: user.lastSeenAt ?? null,
    };
  }
  async logout(refreshToken: string | undefined) {
    if (refreshToken) {
      const tokenHash = createHash("sha256").update(refreshToken).digest("hex");

      await this.dataSource.getRepository(RefreshToken).update(
        {
          tokenHash,
          revokedAt: IsNull(),
        },
        {
          revokedAt: new Date(),
        },
      );
    }

    return { message: "Logged out successfully." };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const now = new Date();
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    const resetRequest = await this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);

      const user = await users.findOne({
        where: { email: dto.email },
        lock: { mode: "pessimistic_write" },
      });

      if (!user || !user.emailVerifiedAt) {
        return null;
      }

      const emailAccount = await manager.getRepository(AuthAccount).findOneBy({
        userId: user.id,
        provider: AuthProvider.EMAIL,
      });

      if (!emailAccount?.passwordHash) {
        return null;
      }

      const tokens = manager.getRepository(AuthToken);

      await tokens.update(
        {
          userId: user.id,
          purpose: AuthTokenPurpose.PASSWORD_RESET,
          consumedAt: IsNull(),
        },
        { consumedAt: now },
      );

      await tokens.save(
        tokens.create({
          userId: user.id,
          purpose: AuthTokenPurpose.PASSWORD_RESET,
          tokenHash,
          expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        }),
      );

      return { email: user.email };
    });

    if (resetRequest) {
      try {
        await this.mailService.sendPasswordResetEmail(
          resetRequest.email,
          rawToken,
        );
      } catch {
        await this.dataSource
          .getRepository(AuthToken)
          .update({ tokenHash }, { consumedAt: new Date() });

        this.logger.error("Password reset email delivery failed.");
      }
    }

    return {
      message:
        "If an eligible account exists, password reset instructions will be sent shortly.",
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (Buffer.byteLength(dto.newPassword, "utf8") > 72) {
      throw new BadRequestException(
        "Password must not exceed 72 bytes when encoded as UTF-8.",
      );
    }

    const tokenHash = createHash("sha256").update(dto.token).digest("hex");

    return this.dataSource.transaction(async (manager) => {
      const authTokens = manager.getRepository(AuthToken);

      const authToken = await authTokens.findOne({
        where: {
          tokenHash,
          purpose: AuthTokenPurpose.PASSWORD_RESET,
        },
        lock: { mode: "pessimistic_write" },
      });

      const now = new Date();

      if (!authToken || authToken.consumedAt || authToken.expiresAt <= now) {
        throw new BadRequestException(
          "Password reset link is invalid or expired.",
        );
      }

      const emailAccount = await manager.getRepository(AuthAccount).findOneBy({
        userId: authToken.userId,
        provider: AuthProvider.EMAIL,
      });

      if (!emailAccount) {
        throw new BadRequestException(
          "Password reset link is invalid or expired.",
        );
      }

      emailAccount.passwordHash = await hash(dto.newPassword, 12);
      await manager.getRepository(AuthAccount).save(emailAccount);

      authToken.consumedAt = now;
      await authTokens.save(authToken);

      await authTokens.update(
        {
          userId: authToken.userId,
          purpose: AuthTokenPurpose.PASSWORD_RESET,
          consumedAt: IsNull(),
        },
        { consumedAt: now },
      );

      await manager.getRepository(RefreshToken).update(
        {
          userId: authToken.userId,
          revokedAt: IsNull(),
        },
        { revokedAt: now },
      );

      return { message: "Password has been reset. Please sign in again." };
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (
      Buffer.byteLength(dto.currentPassword, "utf8") > 72 ||
      Buffer.byteLength(dto.newPassword, "utf8") > 72
    ) {
      throw new BadRequestException(
        "Password must not exceed 72 bytes when encoded as UTF-8.",
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const authAccount = await manager.getRepository(AuthAccount).findOne({
        where: {
          userId,
          provider: AuthProvider.EMAIL,
        },
        lock: { mode: "pessimistic_write" },
      });

      if (!authAccount?.passwordHash) {
        throw new BadRequestException(
          "Password change is unavailable for this account.",
        );
      }

      const currentPasswordIsValid = await compare(
        dto.currentPassword,
        authAccount.passwordHash,
      );

      if (!currentPasswordIsValid) {
        throw new UnauthorizedException("Current password is incorrect.");
      }

      authAccount.passwordHash = await hash(dto.newPassword, 12);
      await manager.getRepository(AuthAccount).save(authAccount);

      await manager.getRepository(RefreshToken).update(
        {
          userId,
          revokedAt: IsNull(),
        },
        { revokedAt: new Date() },
      );

      return {
        message: "Password changed. Please sign in again.",
      };
    });
  }

  async googleLogin(dto: GoogleAuthDto) {
    const identity = await this.googleAuthService.verifyIdToken(dto.idToken);

    const user = await this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const authAccounts = manager.getRepository(AuthAccount);

      const googleAccount = await authAccounts.findOneBy({
        provider: AuthProvider.GOOGLE,
        providerUserId: identity.providerUserId,
      });

      if (googleAccount) {
        const existingUser = await users.findOneBy({
          id: googleAccount.userId,
        });

        if (!existingUser) {
          throw new UnauthorizedException("Google account is unavailable.");
        }

        return existingUser;
      }

      let user = await users.findOne({
        where: { email: identity.email },
        lock: { mode: "pessimistic_write" },
      });

      if (user) {
        user.emailVerifiedAt ??= new Date();
        user = await users.save(user);
      } else {
        const usernameBase =
          identity.email
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "")
            .slice(0, 17) || "user";

        user = users.create({
          email: identity.email,
          username: `${usernameBase}_${randomBytes(6).toString("hex")}`,
          displayName: identity.displayName.slice(0, 80),
          avatarUrl: identity.avatarUrl ?? null,
          emailVerifiedAt: new Date(),
        });

        user = await users.save(user);
      }

      await authAccounts.save(
        authAccounts.create({
          userId: user.id,
          provider: AuthProvider.GOOGLE,
          providerUserId: identity.providerUserId,
        }),
      );

      return user;
    });

    const tokens = await this.createSessionTokens(user.id);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
      },
    };
  }
}
