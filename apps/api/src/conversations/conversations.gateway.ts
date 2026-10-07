import { Logger, UsePipes, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { DataSource, IsNull } from "typeorm";
import type { Server, Socket } from "socket.io";
import { ProfileVisibilityService } from "../profile/profile-visibility.service";
import { ConversationMember } from "../database/entities/conversation-member.entity";
import {
  Conversation,
  ConversationType,
} from "../database/entities/conversation.entity";
import { ConversationTypingDto } from "./dto/conversation-typing.dto";
import { JoinConversationDto } from "./dto/join-conversation.dto";
import { PresenceService } from "./presence.service";
import { UpstashThrottlerStorage } from "../infrastructure/upstash-throttler.storage";
import { WebPushService } from "../infrastructure/web-push.service";

interface AccessTokenPayload {
  sub?: string;
}

interface AuthenticatedSocketData {
  userId?: string;
}

const CONVERSATION_ROOM_PREFIX = "conversation:";
const PRESENCE_REFRESH_INTERVAL_MS = 20_000;

const USER_ROOM_PREFIX = "user:";

function getUserRoom(userId: string) {
  return `${USER_ROOM_PREFIX}${userId}`;
}

function getConversationRoom(conversationId: string) {
  return `${CONVERSATION_ROOM_PREFIX}${conversationId}`;
}

function readCookie(cookieHeader: string | undefined, cookieName: string) {
  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const name = cookie.slice(0, separatorIndex).trim();

    if (name !== cookieName) {
      continue;
    }

    const value = cookie.slice(separatorIndex + 1).trim();

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return undefined;
}

@WebSocketGateway({
  path: "/api/socket.io",
  cors: {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  },
})
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class ConversationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;
  private readonly logger = new Logger(ConversationsGateway.name);
  private readonly presenceRefreshTimers = new Map<
    string,
    ReturnType<typeof setInterval>
  >();

  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly presenceService: PresenceService,
    private readonly profileVisibilityService: ProfileVisibilityService,
    private readonly throttlerStorage: UpstashThrottlerStorage,
    private readonly webPushService: WebPushService,
  ) {}
  afterInit(server: Server) {
    server.use((client, next) => {
      void this.authenticateSocket(client)
        .then(() => next())
        .catch(() => next(new Error("Unauthorized")));
    });
  }

  async handleConnection(client: Socket) {
    const userId = this.getUserId(client);

    if (!userId) {
      client.disconnect(true);
      return;
    }

    const connectedSocketIds = new Set(this.server.sockets.sockets.keys());
    const becameOnline = await this.presenceService.addSocket(
      userId,
      client.id,
      connectedSocketIds,
    );
    await client.join(getUserRoom(userId));
    const refreshTimer = setInterval(() => {
      void this.presenceService.refreshSocket(userId, client.id);
    }, PRESENCE_REFRESH_INTERVAL_MS);

    this.presenceRefreshTimers.set(client.id, refreshTimer);

    if (becameOnline) {
      await this.emitPresenceToActiveConversations(userId, true);
    }

    client.emit("socket:ready");
  }

  async handleDisconnect(client: Socket) {
    const refreshTimer = this.presenceRefreshTimers.get(client.id);

    if (refreshTimer) {
      clearInterval(refreshTimer);
      this.presenceRefreshTimers.delete(client.id);
    }

    const userId = this.getUserId(client);

    if (!userId) {
      return;
    }

    const becameOffline = await this.presenceService.removeSocket(
      userId,
      client.id,
    );

    if (becameOffline) {
      await this.emitPresenceToActiveConversations(userId, false);
    }
  }

  async emitMessage(conversationId: string, message: object) {
    try {
      const conversation = await this.dataSource
        .getRepository(Conversation)
        .findOne({
          where: { id: conversationId },
          select: { id: true, type: true },
        });
      const members = await this.dataSource
        .getRepository(ConversationMember)
        .find({
          where: {
            conversationId,
            leftAt: IsNull(),
          },
          select: { userId: true },
        });

      const payload = message as {
        sender: {
          id: string;
          username: string;
          displayName: string;
          avatarUrl: string | null;
        } | null;
        replyTo: {
          sender: {
            id: string;
            username: string;
            displayName: string;
            avatarUrl: string | null;
          } | null;
        } | null;
        [key: string]: unknown;
      };

      const profileUserIds = [
        ...(payload.sender ? [payload.sender.id] : []),
        ...(payload.replyTo?.sender ? [payload.replyTo.sender.id] : []),
      ];
      const profileAvatarUrls =
        await this.profileVisibilityService.getAvatarUrls(profileUserIds);

      for (const member of members) {
        const visibleProfileUserIds =
          await this.profileVisibilityService.getVisibleProfileUserIds(
            member.userId,
            profileUserIds,
          );

        const personalizedMessage = {
          ...payload,
          sender: this.profileVisibilityService.serializeProfile(
            payload.sender
              ? {
                  ...payload.sender,
                  avatarUrl:
                    profileAvatarUrls.get(payload.sender.id) ??
                    payload.sender.avatarUrl ??
                    null,
                }
              : null,
            visibleProfileUserIds,
          ),
          replyTo: payload.replyTo
            ? {
                ...payload.replyTo,
                sender: this.profileVisibilityService.serializeProfile(
                  payload.replyTo.sender
                    ? {
                        ...payload.replyTo.sender,
                        avatarUrl:
                          profileAvatarUrls.get(payload.replyTo.sender.id) ??
                          payload.replyTo.sender.avatarUrl ??
                          null,
                      }
                    : null,
                  visibleProfileUserIds,
                ),
              }
            : null,
        };

        this.server
          .to(getUserRoom(member.userId))
          .emit("conversation:message", personalizedMessage);

        if (
          conversation?.type !== ConversationType.WORLD &&
          payload.sender?.id !== member.userId
        ) {
          void this.webPushService
            .sendToUser(member.userId, "new_message", `/chat/${conversationId}`)
            .catch((error: unknown) => {
              this.logger.warn(
                "Could not deliver a new-message browser notification.",
                error instanceof Error ? error.message : undefined,
              );
            });
        }
      }
    } catch (error) {
      this.logger.error(
        "Could not broadcast the new conversation message.",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
  emitMessageUpdated(event: {
    conversationId: string;
    messageId: string;
    body: string;
    editedAt: Date;
  }) {
    void this.emitToActiveConversationMembers(
      event.conversationId,
      "conversation:message-updated",
      event,
    );
  }

  emitMessageDeleted(event: { conversationId: string; messageId: string }) {
    void this.emitToActiveConversationMembers(
      event.conversationId,
      "conversation:message-deleted",
      event,
    );
  }
  emitReadUpdated(event: {
    conversationId: string;
    userId: string;
    lastReadAt: Date;
  }) {
    void this.emitToActiveConversationMembers(
      event.conversationId,
      "conversation:read-updated",
      event,
    );
  }

  private async emitToActiveConversationMembers(
    conversationId: string,
    eventName: string,
    payload: object,
  ) {
    try {
      const members = await this.dataSource
        .getRepository(ConversationMember)
        .find({
          where: {
            conversationId,
            leftAt: IsNull(),
          },
          select: { userId: true },
        });

      const userRooms = members.map((member) => getUserRoom(member.userId));

      if (userRooms.length > 0) {
        this.server.to(userRooms).emit(eventName, payload);
      }
    } catch (error) {
      this.logger.error(
        `Could not broadcast ${eventName}.`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async emitReactionUpdated(conversationId: string, event: object) {
    try {
      const members = await this.dataSource
        .getRepository(ConversationMember)
        .find({
          where: {
            conversationId,
            leftAt: IsNull(),
          },
          select: { userId: true },
        });

      const rooms = [
        getConversationRoom(conversationId),
        ...members.map((member) => getUserRoom(member.userId)),
      ];

      this.server.to(rooms).emit("conversation:reaction", event);
    } catch (error) {
      this.logger.error(
        "Could not broadcast the message reaction.",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  emitUserEvent(userId: string, eventName: string, payload: object) {
    try {
      this.server.to(getUserRoom(userId)).emit(eventName, payload);
    } catch (error) {
      this.logger.error(
        `Could not send ${eventName} to a user room.`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
  @SubscribeMessage("conversation:join")
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinConversationDto,
  ) {
    const userId = this.getUserId(client);

    if (!userId) {
      client.disconnect(true);
      return;
    }

    if (!(await this.allowSocketEvent(client, userId, "join", 30, 60_000))) {
      return;
    }

    const membersRepository = this.dataSource.getRepository(ConversationMember);
    const membership = await membersRepository
      .createQueryBuilder("membership")
      .innerJoin("membership.conversation", "conversation")
      .where("membership.conversationId = :conversationId", {
        conversationId: dto.conversationId,
      })
      .andWhere("membership.userId = :userId", { userId })
      .andWhere("membership.leftAt IS NULL")
      .andWhere("conversation.deletedAt IS NULL")
      .select("membership.id")
      .getOne();

    if (!membership) {
      client.emit("socket:error", {
        message: "You are not an active member of this conversation.",
      });
      return;
    }

    const room = getConversationRoom(dto.conversationId);
    client.join(room);

    const activeMembers = await membersRepository.find({
      where: {
        conversationId: dto.conversationId,
        leftAt: IsNull(),
      },
      relations: { user: true },
    });

    const presence = await Promise.all(
      activeMembers.map((member) =>
        this.presenceService.getStatus(member.userId),
      ),
    );

    client.emit("conversation:presence", {
      conversationId: dto.conversationId,
      users: presence,
    });

    client.emit("conversation:joined", {
      conversationId: dto.conversationId,
    });
  }

  @SubscribeMessage("conversation:typing")
  async updateTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ConversationTypingDto,
  ) {
    const userId = this.getUserId(client);

    if (!userId) {
      client.disconnect(true);
      return;
    }

    if (!(await this.allowSocketEvent(client, userId, "typing", 120, 60_000))) {
      return;
    }

    const membersRepository = this.dataSource.getRepository(ConversationMember);

    const membership = await membersRepository
      .createQueryBuilder("membership")
      .innerJoin("membership.conversation", "conversation")
      .where("membership.conversationId = :conversationId", {
        conversationId: dto.conversationId,
      })
      .andWhere("membership.userId = :userId", { userId })
      .andWhere("membership.leftAt IS NULL")
      .andWhere("conversation.deletedAt IS NULL")
      .select("membership.id")
      .getOne();
    if (!membership) {
      client.emit("socket:error", {
        message: "You are not an active member of this conversation.",
      });
      return;
    }

    client
      .to(getConversationRoom(dto.conversationId))
      .emit("conversation:typing", {
        conversationId: dto.conversationId,
        userId,
        isTyping: dto.isTyping,
      });
  }
  emitConversationCreated(participantIds: string[], conversationId: string) {
    for (const userId of participantIds) {
      this.server.to(getUserRoom(userId)).emit("conversation:created", {
        conversationId,
      });
    }
  }

  emitConversationMembersChanged(
    participantIds: string[],
    conversationId: string,
  ) {
    for (const userId of participantIds) {
      this.server.to(getUserRoom(userId)).emit("conversation:members-changed", {
        conversationId,
      });
    }
  }
  emitConversationDeleted(participantIds: string[], conversationId: string) {
    for (const userId of participantIds) {
      this.server.to(getUserRoom(userId)).emit("conversation:deleted", {
        conversationId,
      });
    }
  }
  private async emitPresenceToActiveConversations(
    userId: string,
    isOnline: boolean,
  ) {
    const memberships = await this.dataSource
      .getRepository(ConversationMember)
      .find({
        where: {
          userId,
          leftAt: IsNull(),
        },
        select: { conversationId: true },
      });

    for (const membership of memberships) {
      const status = await this.presenceService.getStatus(userId);

      this.server
        .to(getConversationRoom(membership.conversationId))
        .emit("presence:update", {
          conversationId: membership.conversationId,
          ...status,
          isOnline,
          lastSeenAt: isOnline ? null : status.lastSeenAt,
        });
    }
  }

  private async authenticateSocket(client: Socket) {
    const accessToken = readCookie(
      client.handshake.headers.cookie,
      "access_token",
    );

    if (!accessToken) {
      throw new Error("Missing access token.");
    }

    const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
      accessToken,
      {
        secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
      },
    );

    if (typeof payload.sub !== "string") {
      throw new Error("Invalid access token.");
    }

    (client.data as AuthenticatedSocketData).userId = payload.sub;
  }

  private getUserId(client: Socket) {
    const userId: unknown = (client.data as AuthenticatedSocketData).userId;
    return typeof userId === "string" ? userId : null;
  }

  private async allowSocketEvent(
    client: Socket,
    userId: string,
    eventName: string,
    limit: number,
    ttl: number,
  ) {
    const result = await this.throttlerStorage.increment(
      `socket:${userId}:${eventName}`,
      ttl,
      limit,
      ttl,
      `socket-${eventName}`,
    );

    if (result.isBlocked) {
      client.emit("socket:error", {
        message: "You are sending events too quickly. Please wait a moment.",
        retryAfterSeconds: result.timeToBlockExpire,
      });
      return false;
    }

    return true;
  }
}
