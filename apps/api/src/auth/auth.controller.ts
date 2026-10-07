import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  Req,
  Get,
  UseGuards,
  Patch,
} from "@nestjs/common";
import { Request, Response } from "express";

import { AuthService } from "./auth.service";
import { SignupDto } from "./dto/signup.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { ResendVerificationDto } from "./dto/resend-verification.dto";
import { LoginDto } from "./dto/login.dto";
import { AuthCookieService } from "./auth-cookie.service";
import { AccessTokenGuard } from "../common/guards/auth-token.guard";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../common/decorators/current-user.decorator";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { GoogleAuthDto } from "./dto/google-auth.dto";
import { RateLimit } from "../common/decorators/rate-limit.decorator";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  private completeLogin<TUser>(
    response: Response,
    result: {
      accessToken: string;
      refreshToken: string;
      user: TUser;
    },
  ) {
    this.authCookieService.setAuthCookies(response, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    return { user: result.user };
  }

  @Post("signup")
  @RateLimit(5, 60 * 60 * 1000)
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post("verify-email")
  @RateLimit(10, 15 * 60 * 1000)
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post("resend-verification")
  @RateLimit(3, 60 * 60 * 1000)
  @HttpCode(HttpStatus.ACCEPTED)
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(dto);
  }

  @Post("login")
  @RateLimit(5, 15 * 60 * 1000)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);
    return this.completeLogin(response, result);
  }

  @Post("refresh")
  @RateLimit(30, 60 * 1000)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ) {
    const tokens = await this.authService.refresh(
      request.cookies?.refresh_token,
    );

    this.authCookieService.setAuthCookies(response, tokens);

    return { message: "Session refreshed." };
  }

  @Get("me")
  @UseGuards(AccessTokenGuard)
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getCurrentUser(user.id);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logout(
      request.cookies?.refresh_token,
    );

    this.authCookieService.clearAuthCookies(response);

    return result;
  }

  @Post("forgot-password")
  @RateLimit(3, 60 * 60 * 1000)
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post("reset-password")
  @RateLimit(5, 15 * 60 * 1000)
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Patch("change-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.changePassword(user.id, dto);

    this.authCookieService.clearAuthCookies(response);

    return result;
  }

  @Post("google")
  @RateLimit(10, 15 * 60 * 1000)
  @HttpCode(HttpStatus.OK)
  async googleLogin(
    @Body() dto: GoogleAuthDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.googleLogin(dto);
    return this.completeLogin(response, result);
  }
}
