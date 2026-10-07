import {
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { DataSource, EntityManager, IsNull, LessThan, MoreThan } from "typeorm";
import {
  Notification,
  NotificationType,
} from "../database/entities/notification.entity";
import { ConversationsGateway } from "../conversations/conversations.gateway";

const NOTIFICATION_RETENTION_DAYS = 7;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

export interface CreateNotificationInput {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  data?: Record<string, string> | null;
}

export interface SerializedNotification {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  data: Record<string, string> | null;
  createdAt: Date;
  readAt: Date | null;
}

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly conversationsGateway: ConversationsGateway,
  ) {}

  async onModuleInit() {
    await this.cleanupExpiredNotifications();
    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpiredNotifications();
    }, CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async createInTransaction(
    manager: EntityManager,
    input: CreateNotificationInput,
  ) {
    const repository = manager.getRepository(Notification);
    const notification = await repository.save(
      repository.create({
        recipientId: input.recipientId,
        actorId: input.actorId ?? null,
        type: input.type,
        data: input.data ?? null,
      }),
    );
    return this.serialize(notification);
  }

  emitCreated(notification: SerializedNotification) {
    this.conversationsGateway.emitUserEvent(
      notification.recipientId,
      "notification:new",
      { notification },
    );
  }

  emitFriendsChanged(userIds: string[]) {
    for (const userId of new Set(userIds)) {
      this.conversationsGateway.emitUserEvent(userId, "friends:changed", {});
    }
  }

  async listForUser(userId: string) {
    const items = await this.dataSource.getRepository(Notification).find({
      where: { recipientId: userId, createdAt: this.getRetentionStart() },
      order: { createdAt: "DESC" },
      take: 50,
    });
    return items.map((item) => this.serialize(item));
  }

  async getUnreadCount(userId: string) {
    return {
      count: await this.dataSource.getRepository(Notification).count({
        where: {
          recipientId: userId,
          readAt: IsNull(),
          createdAt: this.getRetentionStart(),
        },
      }),
    };
  }

  async markRead(userId: string, notificationId: string) {
    const repository = this.dataSource.getRepository(Notification);
    const result = await repository.update(
      { id: notificationId, recipientId: userId, readAt: IsNull() },
      { readAt: new Date() },
    );

    if (!result.affected) {
      const existing = await repository.findOneBy({
        id: notificationId,
        recipientId: userId,
      });
      if (!existing) throw new NotFoundException("Notification not found.");
    }

    return this.getUnreadCount(userId);
  }

  async markAllRead(userId: string) {
    await this.dataSource
      .getRepository(Notification)
      .update(
        { recipientId: userId, readAt: IsNull() },
        { readAt: new Date() },
      );
    return { count: 0 };
  }

  async cleanupExpiredNotifications() {
    try {
      await this.dataSource.getRepository(Notification).delete({
        createdAt: LessThan(this.getExpiryBoundaryDate()),
      });
    } catch (error) {
      this.logger.error(
        "Could not remove expired notifications.",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private serialize(notification: Notification) {
    return {
      id: notification.id,
      recipientId: notification.recipientId,
      actorId: notification.actorId ?? null,
      type: notification.type,
      data: notification.data ?? null,
      createdAt: notification.createdAt,
      readAt: notification.readAt ?? null,
    };
  }

  private getRetentionStart() {
    return MoreThan(this.getExpiryBoundaryDate());
  }

  private getExpiryBoundaryDate() {
    const boundary = new Date();
    boundary.setDate(boundary.getDate() - NOTIFICATION_RETENTION_DAYS);
    return boundary;
  }
}
