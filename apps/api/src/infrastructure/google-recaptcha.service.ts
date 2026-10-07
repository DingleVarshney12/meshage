import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface RecaptchaVerificationResponse {
  success: boolean;
  hostname?: string;
}

@Injectable()
export class GoogleRecaptchaService {
  constructor(private readonly configService: ConfigService) {}

  async verifyOrThrow(token: string): Promise<void> {
    const secret = this.configService.get<string>("RECAPTCHA_SECRET_KEY");

    if (!secret) {
      throw new ServiceUnavailableException(
        "reCAPTCHA is not configured on the server.",
      );
    }

    let result: RecaptchaVerificationResponse;

    try {
      const body = new URLSearchParams({ secret, response: token });
      const response = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
          signal: AbortSignal.timeout(5_000),
        },
      );

      if (!response.ok) throw new Error("Google verification request failed.");
      result = (await response.json()) as RecaptchaVerificationResponse;
    } catch {
      throw new ServiceUnavailableException(
        "Could not verify reCAPTCHA. Please try again.",
      );
    }

    const webOrigin = this.configService.get<string>(
      "WEB_ORIGIN",
      "http://localhost:3000",
    );
    const expectedHostname = new URL(webOrigin).hostname;

    if (!result.success || result.hostname !== expectedHostname) {
      throw new BadRequestException(
        "Please complete the reCAPTCHA challenge and try again.",
      );
    }
  }
}
