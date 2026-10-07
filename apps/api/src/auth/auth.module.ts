import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { DatabaseModule } from "../database/database.module";
import { MailModule } from "../mail/mail.module";
import { AuthCookieService } from "./auth-cookie.service";
import { AccessTokenGuard } from "../common/guards/auth-token.guard";
import { GoogleAuthService } from "./google-auth.service";

@Module({
  imports: [
    DatabaseModule,
    MailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        signOptions: { expiresIn: 15 * 60 },
      }),
    }),
  ],
  providers: [
    AuthService,
    AuthCookieService,
    AccessTokenGuard,
    GoogleAuthService,
  ],
  controllers: [AuthController],
  exports: [JwtModule, AccessTokenGuard],
})
export class AuthModule {}
