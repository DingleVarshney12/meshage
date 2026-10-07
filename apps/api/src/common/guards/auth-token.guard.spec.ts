import "reflect-metadata";
import { jest } from "@jest/globals";

import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import { AccessTokenGuard } from "./auth-token.guard";

describe("AccessTokenGuard", () => {
  function createContext(request: { cookies?: Record<string, unknown> }) {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it("rejects requests without an access-token cookie", async () => {
    const jwtService = {
      verifyAsync: jest.fn<(...args: any[]) => any>(),
    } as unknown as JwtService;
    const guard = new AccessTokenGuard(jwtService);

    await expect(guard.canActivate(createContext({}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it("rejects invalid tokens", async () => {
    const jwtService = {
      verifyAsync: jest
        .fn<(...args: any[]) => any>()
        .mockRejectedValue(new Error("expired")),
    } as unknown as JwtService;
    const guard = new AccessTokenGuard(jwtService);

    await expect(
      guard.canActivate(
        createContext({ cookies: { access_token: "invalid-token" } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("attaches the verified user id to the request", async () => {
    const jwtService = {
      verifyAsync: jest
        .fn<(...args: any[]) => any>()
        .mockResolvedValue({ sub: "user-123" }),
    } as unknown as JwtService;
    const guard = new AccessTokenGuard(jwtService);
    const request: { cookies: Record<string, unknown>; user?: { id: string } } =
      {
        cookies: { access_token: "valid-token" },
      };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: "user-123" });
  });

  it("rejects a verified token that has no subject", async () => {
    const jwtService = {
      verifyAsync: jest.fn<(...args: any[]) => any>().mockResolvedValue({}),
    } as unknown as JwtService;
    const guard = new AccessTokenGuard(jwtService);

    await expect(
      guard.canActivate(
        createContext({ cookies: { access_token: "token-without-sub" } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
