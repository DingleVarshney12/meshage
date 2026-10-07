import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthenticatedUser } from "../decorators/current-user.decorator";

interface AccessTokenPayload {
  sub?: string;
}

interface AuthenticatedRequest {
  cookies?: Record<string, unknown>;
  user?: AuthenticatedUser;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const accessToken = request.cookies?.access_token;

    if (typeof accessToken !== "string") {
      throw new UnauthorizedException();
    }

    let payload: AccessTokenPayload;

    try {
      payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(accessToken);
    } catch {
      throw new UnauthorizedException();
    }

    if (typeof payload.sub !== "string") {
      throw new UnauthorizedException();
    }

    request.user = { id: payload.sub };

    return true;
  }
}
