import {
  Controller,
  Delete,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { AccessTokenGuard } from "../common/guards/auth-token.guard";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../common/decorators/current-user.decorator";
import { NotificationsService } from "./notifications.service";
import { RateLimit } from "../common/decorators/rate-limit.decorator";
import {
  PushSubscriptionDto,
  RemovePushSubscriptionDto,
} from "./dto/push-subscription.dto";
import { WebPushService } from "../infrastructure/web-push.service";

@Controller("notifications")
@UseGuards(AccessTokenGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly webPushService: WebPushService,
  ) {}

  @Get("push/vapid-public-key")
  getPushPublicKey() {
    return this.webPushService.getPublicKey();
  }

  @Post("push-subscriptions")
  @RateLimit(10, 60 * 60 * 1000)
  savePushSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PushSubscriptionDto,
    @Req() request: Request,
  ) {
    return this.webPushService.saveSubscription(user.id, {
      ...dto,
      userAgent: dto.userAgent ?? request.headers["user-agent"],
    });
  }

  @Delete("push-subscriptions")
  @RateLimit(10, 60 * 60 * 1000)
  removePushSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RemovePushSubscriptionDto,
  ) {
    return this.webPushService.removeSubscription(user.id, dto.endpoint);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.listForUser(user.id);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch("read-all")
  @RateLimit(30, 60 * 1000)
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Patch(":notificationId/read")
  @RateLimit(60, 60 * 1000)
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param("notificationId", ParseUUIDPipe) notificationId: string,
  ) {
    return this.notificationsService.markRead(user.id, notificationId);
  }
}
