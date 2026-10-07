import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport } from "nodemailer";

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    await this.sendTokenEmail(
      email,
      token,
      "Verify your Meshage email",
      "verify-email",
      "Verify your email",
    );
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    await this.sendTokenEmail(
      email,
      token,
      "Reset your Meshage password",
      "reset-password",
      "Reset your password",
    );
  }

  private async sendTokenEmail(
    email: string,
    token: string,
    subject: string,
    path: string,
    message: string,
  ): Promise<void> {
    const host = this.config.get<string>("SMTP_HOST");
    const port = Number(this.config.get<string>("SMTP_PORT") ?? 587);
    const username = this.config.get<string>("SMTP_USER");
    const password = this.config.get<string>("SMTP_PASSWORD");
    const from = this.config.get<string>("EMAIL_FROM");
    const webOrigin = this.config.get<string>("WEB_ORIGIN");

    if (!host || !username || !password || !from || !webOrigin) {
      throw new InternalServerErrorException(
        "Email delivery is not configured.",
      );
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new InternalServerErrorException("SMTP_PORT is invalid.");
    }

    const transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: username, pass: password },
    });

    const baseUrl = webOrigin.replace(/\/$/, "");
    const link = `${baseUrl}/${path}?token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
      from,
      to: email,
      subject,
      text: `${message}: ${link}`,
    });
  }
}
