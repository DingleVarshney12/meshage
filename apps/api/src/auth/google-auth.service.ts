import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";

export interface GoogleIdentity {
  providerUserId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

@Injectable()
export class GoogleAuthService {
  private readonly clientId: string;
  private readonly client: OAuth2Client;

  constructor(configService: ConfigService) {
    this.clientId = configService.getOrThrow<string>("GOOGLE_CLIENT_ID");
    this.client = new OAuth2Client(this.clientId);
  }

  async verifyIdToken(idToken: string): Promise<GoogleIdentity> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw new UnauthorizedException("Invalid Google sign-in token.");
      }

      return {
        providerUserId: payload.sub,
        email: payload.email.toLowerCase(),
        displayName: payload.name?.trim() || payload.email.split("@")[0],
        avatarUrl: payload.picture,
      };
    } catch {
      throw new UnauthorizedException("Invalid Google sign-in token.");
    }
  }
}
