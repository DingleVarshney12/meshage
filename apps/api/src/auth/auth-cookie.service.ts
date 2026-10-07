import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
type CookieSameSite = "lax" | "none";

@Injectable()
export class AuthCookieService {
  private readonly secure: boolean;
  private readonly sameSite: CookieSameSite;

  constructor(configService: ConfigService) {
    this.secure = configService.get<string>("NODE_ENV") === "production";
    this.sameSite = this.secure ? "none" : "lax";
  }

  setAccessTokenCookie(response: Response, accessToken: string): void {
    response.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: "/api",
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
  }

  setRefreshTokenCookie(response: Response, refreshToken: string): void {
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: "/api/auth/refresh",
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }

  setAuthCookies(
    response: Response,
    tokens: { accessToken: string; refreshToken: string },
  ): void {
    this.setAccessTokenCookie(response, tokens.accessToken);
    this.setRefreshTokenCookie(response, tokens.refreshToken);
  }

  clearAccessTokenCookie(response: Response): void {
    response.clearCookie(ACCESS_TOKEN_COOKIE, {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: "/api",
    });
  }

  clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: "/api/auth/refresh",
    });
  }

  clearAuthCookies(response: Response): void {
    this.clearAccessTokenCookie(response);
    this.clearRefreshTokenCookie(response);
  }
}
