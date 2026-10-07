import "reflect-metadata";
import { jest } from "@jest/globals";

import type { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { AuthCookieService } from "./auth-cookie.service";

describe("AuthCookieService", () => {
  function createService(environment: string) {
    const configService = {
      get: jest.fn<(...args: any[]) => any>().mockReturnValue(environment),
    } as unknown as ConfigService;

    return new AuthCookieService(configService);
  }

  function createResponse() {
    return {
      cookie: jest.fn<(...args: any[]) => any>(),
      clearCookie: jest.fn<(...args: any[]) => any>(),
    } as unknown as Response;
  }

  it("sets both tokens as secure HttpOnly cookies in production", () => {
    const service = createService("production");
    const response = createResponse();

    service.setAuthCookies(response, {
      accessToken: "access-test-token",
      refreshToken: "refresh-test-token",
    });

    expect(response.cookie).toHaveBeenNthCalledWith(
      1,
      "access_token",
      "access-test-token",
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/api",
      }),
    );

    expect(response.cookie).toHaveBeenNthCalledWith(
      2,
      "refresh_token",
      "refresh-test-token",
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/api/auth/refresh",
      }),
    );
  });

  it("uses non-secure cookies outside production", () => {
    const service = createService("development");
    const response = createResponse();

    service.setAccessTokenCookie(response, "access-test-token");

    expect(response.cookie).toHaveBeenCalledWith(
      "access_token",
      "access-test-token",
      expect.objectContaining({ secure: false, httpOnly: true }),
    );
  });

  it("clears both cookies using their original paths", () => {
    const service = createService("production");
    const response = createResponse();

    service.clearAuthCookies(response);

    expect(response.clearCookie).toHaveBeenNthCalledWith(
      1,
      "access_token",
      expect.objectContaining({ path: "/api" }),
    );

    expect(response.clearCookie).toHaveBeenNthCalledWith(
      2,
      "refresh_token",
      expect.objectContaining({ path: "/api/auth/refresh" }),
    );
  });
});
