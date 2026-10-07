import {
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import webPush from "web-push";
import { PushSubscription as PushSubscriptionEntity } from "../database/entities/push-subscription.entity";

export type BrowserPushEvent =
  | "new_message"
  | "friend_request_received"
  | "friend_request_accepted"
  | "friend_request_rejected";

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly publicKey: string;
  private readonly privateKey: string;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly dataSource?: DataSource,
  ) {
    this.publicKey = this.configService.get<string>(
      "WEB_PUSH_VAPID_PUBLIC_KEY",
      "",
    );
    this.privateKey = this.configService.get<string>(
      "WEB_PUSH_VAPID_PRIVATE_KEY",
      "",
    );
    const subject = this.configService.get<string>(
      "WEB_PUSH_VAPID_SUBJECT",
      "https://meshage.vercel.app",
    );

    if (this.publicKey && this.privateKey) {
      webPush.setVapidDetails(subject, this.publicKey, this.privateKey);
    }
  }

  getPublicKey() {
    if (!this.publicKey || !this.privateKey) {
      throw new ServiceUnavailableException(
        "Browser notifications are not configured on the server.",
      );
    }
    return { publicKey: this.publicKey };
  }

  async saveSubscription(
    userId: string,
    input: {
      endpoint: string;
      p256dh: string;
      auth: string;
      userAgent?: string;
    },
  ) {
    if (!this.dataSource) {
      throw new ServiceUnavailableException("The database is unavailable.");
    }
    await this.dataSource.getRepository(PushSubscriptionEntity).upsert(
      {
        userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
      },
      { conflictPaths: ["endpoint"], skipUpdateIfNoValuesChanged: true },
    );
    return { message: "Browser notifications enabled." };
  }

  async removeSubscription(userId: string, endpoint: string) {
    if (!this.dataSource) {
      throw new ServiceUnavailableException("The database is unavailable.");
    }
    await this.dataSource.getRepository(PushSubscriptionEntity).delete({
      userId,
      endpoint,
    });
    return { message: "Browser notifications disabled." };
  }

  async sendToUser(userId: string, event: BrowserPushEvent, url = "/chat") {
    const dataSource = this.dataSource;
    if (!this.publicKey || !this.privateKey || !dataSource) return;

    const titles: Record<BrowserPushEvent, string> = {
      new_message: "New message",
      friend_request_received: "New friend request",
      friend_request_accepted: "Friend request accepted",
      friend_request_rejected: "Friend request declined",
    };
    const subscriptions = await dataSource
      .getRepository(PushSubscriptionEntity)
      .findBy({ userId });

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            JSON.stringify({ title: titles[event], url }),
            { TTL: 60 },
          );
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await dataSource
              .getRepository(PushSubscriptionEntity)
              .delete({ id: subscription.id });
            return;
          }

          this.logger.warn(
            `Could not send browser push notification (${statusCode ?? "unknown"}).`,
          );
        }
      }),
    );
  }
}
