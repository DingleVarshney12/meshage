import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { DataSource, In, type EntityManager, IsNull } from "typeorm";
import {
  ConversationMember,
  ConversationMemberRole,
} from "../database/entities/conversation-member.entity";
import {
  Conversation,
  ConversationType,
} from "../database/entities/conversation.entity";
import { Friendship } from "../database/entities/friendship.entity";
import { Message, MessageType } from "../database/entities/message.entity";
import { ConversationsGateway } from "./conversations.gateway";
import { CreateDirectConversationDto } from "./dto/create-direct-conversation.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { GetMessagesQueryDto } from "./dto/get-messages-query.dto";
import { CreateGroupConversationDto } from "./dto/create-group-conversation.dto";
import { UpdateGroupSettingsDto } from "./dto/update-group-settings.dto";
import { AddGroupMembersDto } from "./dto/add-group-members.dto";
import { MessageReaction } from "../database/entities/message-reaction.entity";
import { ProfileVisibilityService } from "../profile/profile-visibility.service";
import { MessageAttachment } from "../database/entities/message-attachment.entity";
import { UpdateMessageDto } from "./dto/update-message.dto";
import {
  ConversationUploadFile,
  ConversationMediaService,
  SerializedMessageAttachment,
} from "./conversation-media.service";
import { GroupAvatarService } from "./group-avatar.service";

export interface SerializedReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

@Injectable()
export class ConversationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly conversationsGateway: ConversationsGateway,
    private readonly profileVisibilityService: ProfileVisibilityService,
    private readonly mediaService: ConversationMediaService,
    private readonly groupAvatarService: GroupAvatarService,
  ) {}
  async joinWorldChat(userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const conversation = await manager
        .getRepository(Conversation)
        .findOneBy({ type: ConversationType.WORLD });

      if (!conversation) {
        throw new ServiceUnavailableException(
          "World chat is not initialized. Run the latest database migration.",
        );
      }

      const memberRepository = manager.getRepository(ConversationMember);
      const activeMembership = await memberRepository.findOne({
        where: {
          conversationId: conversation.id,
          userId,
          leftAt: IsNull(),
        },
        select: {
          id: true,
          hiddenAt: true,
        },
      });

      if (activeMembership) {
        if (activeMembership.hiddenAt) {
          await memberRepository.update(activeMembership.id, {
            hiddenAt: null,
          });
        }

        return {
          conversationId: conversation.id,
          joined: false,
        };
      }

      await memberRepository
        .createQueryBuilder()
        .insert()
        .into(ConversationMember)
        .values({
          conversationId: conversation.id,
          userId,
          role: ConversationMemberRole.MEMBER,
        })
        .orIgnore()
        .execute();

      return {
        conversationId: conversation.id,
        joined: true,
      };
    });
  }
  async listForUser(userId: string) {
    const memberRepository = this.dataSource.getRepository(ConversationMember);

    const memberships = await memberRepository
      .createQueryBuilder("membership")
      .innerJoinAndSelect("membership.conversation", "conversation")
      .where("membership.userId = :userId", { userId })
      .andWhere("membership.leftAt IS NULL")
      .andWhere("membership.hiddenAt IS NULL")
      .andWhere("conversation.deletedAt IS NULL")
      .orderBy("conversation.updatedAt", "DESC")
      .getMany();

    if (memberships.length === 0) {
      return [];
    }
    const unreadRows = await memberRepository
      .createQueryBuilder("membership")
      .innerJoin("membership.conversation", "conversation")
      .innerJoin(
        Message,
        "message",
        [
          "message.conversation_id = membership.conversation_id",
          "message.deleted_at IS NULL",
          "message.sender_id IS DISTINCT FROM :userId",
          "message.created_at > COALESCE(membership.last_read_at, membership.joined_at)",
          "(membership.history_cleared_at IS NULL OR message.created_at > membership.history_cleared_at)",
        ].join(" AND "),
        { userId },
      )
      .where("membership.userId = :userId", { userId })
      .andWhere("membership.leftAt IS NULL")
      .andWhere("membership.hiddenAt IS NULL")
      .andWhere("conversation.deletedAt IS NULL")
      .groupBy("membership.conversationId")
      .select("membership.conversationId", "conversationId")
      .addSelect("COUNT(message.id)", "unreadCount")
      .getRawMany<{ conversationId: string; unreadCount: string }>();

    const unreadCountByConversationId = new Map(
      unreadRows.map((row) => [row.conversationId, Number(row.unreadCount)]),
    );
    const conversationIds = memberships.map(
      (membership) => membership.conversationId,
    );

    const activeMembers = await memberRepository
      .createQueryBuilder("member")
      .innerJoinAndSelect("member.user", "user")
      .where("member.conversationId IN (:...conversationIds)", {
        conversationIds,
      })
      .andWhere("member.leftAt IS NULL")
      .getMany();

    const membersByConversation = new Map<string, ConversationMember[]>();

    for (const member of activeMembers) {
      const conversationMembers =
        membersByConversation.get(member.conversationId) ?? [];

      conversationMembers.push(member);
      membersByConversation.set(member.conversationId, conversationMembers);
    }

    const latestMessages = await this.dataSource
      .getRepository(Message)
      .createQueryBuilder("message")
      .leftJoinAndSelect("message.sender", "sender")
      .distinctOn(["message.conversationId"])
      .where("message.conversationId IN (:...conversationIds)", {
        conversationIds,
      })
      .andWhere("message.deletedAt IS NULL")
      .orderBy("message.conversationId", "ASC")
      .addOrderBy("message.createdAt", "DESC")
      .addOrderBy("message.id", "DESC")
      .getMany();

    const latestMessageByConversation = new Map(
      latestMessages.map((message) => [message.conversationId, message]),
    );

    const visibleProfileUserIds =
      await this.profileVisibilityService.getVisibleProfileUserIds(userId, [
        ...activeMembers.map((member) => member.userId),
        ...latestMessages
          .map((message) => message.senderId)
          .filter(
            (senderId): senderId is string =>
              senderId !== null && senderId !== undefined,
          ),
      ]);
    const profileAvatarUrls = await this.profileVisibilityService.getAvatarUrls(
      [
        ...activeMembers.map((member) => member.userId),
        ...latestMessages
          .map((message) => message.senderId)
          .filter(
            (senderId): senderId is string =>
              senderId !== null && senderId !== undefined,
          ),
      ],
    );
    const attachmentsByMessageId =
      await this.mediaService.getSerializedAttachmentsByMessageIds(
        latestMessages.map((message) => message.id),
      );
    return Promise.all(
      memberships.map(async (membership) => {
        const conversation = membership.conversation;
        const conversationMembers =
          membersByConversation.get(membership.conversationId) ?? [];
        const latestMessage = latestMessageByConversation.get(
          membership.conversationId,
        );

        const hasVisibleLatestMessage =
          latestMessage &&
          (!membership.historyClearedAt ||
            latestMessage.createdAt > membership.historyClearedAt);
        return {
          id: conversation.id,
          type: conversation.type,
          title: conversation.title,
          description: conversation.description,
          avatarUrl: await this.groupAvatarService.getAvatarUrl(conversation),
          updatedAt: conversation.updatedAt,
          lastReadAt: membership.lastReadAt,
          unreadCount:
            unreadCountByConversationId.get(membership.conversationId) ?? 0,
          currentUserRole: membership.role,
          members: conversationMembers.map((member) => ({
            ...this.profileVisibilityService.serializeProfile(
              {
                id: member.user.id,
                username: member.user.username,
                displayName: member.user.displayName,
                avatarUrl:
                  profileAvatarUrls.get(member.user.id) ??
                  member.user.avatarUrl ??
                  null,
              },
              visibleProfileUserIds,
            )!,
            role: member.role,
            lastReadAt: member.lastReadAt?.toISOString() ?? null,
          })),
          lastMessage:
            latestMessage && hasVisibleLatestMessage
              ? this.serializeMessage(
                  latestMessage,
                  [],
                  visibleProfileUserIds,
                  profileAvatarUrls,
                  attachmentsByMessageId,
                )
              : null,
        };
      }),
    );
  }
  async markConversationAsRead(userId: string, conversationId: string) {
    const result = await this.dataSource.transaction(async (manager) => {
      const membership = await manager
        .getRepository(ConversationMember)
        .findOne({
          where: {
            conversationId,
            userId,
            leftAt: IsNull(),
          },
          select: { id: true },
          lock: { mode: "pessimistic_write" },
        });

      if (!membership) {
        throw new NotFoundException("Conversation not found.");
      }

      const lastReadAt = new Date();

      await manager.getRepository(ConversationMember).update(membership.id, {
        lastReadAt,
      });

      return { conversationId, userId, lastReadAt };
    });

    this.conversationsGateway.emitReadUpdated(result);

    return result;
  }
  async createDirectConversation(
    currentUserId: string,
    dto: CreateDirectConversationDto,
  ) {
    if (currentUserId === dto.userId) {
      throw new BadRequestException(
        "You cannot start a conversation with yourself.",
      );
    }

    const [userAId, userBId] = [currentUserId, dto.userId].sort();
    const directKey = `${userAId}:${userBId}`;

    return this.dataSource.transaction(async (manager) => {
      const friendshipRepository = manager.getRepository(Friendship);

      const friendship = await friendshipRepository.findOne({
        where: { userAId, userBId },
        lock: { mode: "pessimistic_write" },
      });

      if (!friendship) {
        throw new ForbiddenException(
          "You can only start a direct chat with a friend.",
        );
      }

      const conversationRepository = manager.getRepository(Conversation);

      let conversation = await conversationRepository.findOne({
        where: { directKey },
      });

      if (conversation) {
        // Reopening a removed direct chat should show it again without restoring
        // messages hidden by the user's history-cleared timestamp.
        await manager
          .getRepository(ConversationMember)
          .update(
            { conversationId: conversation.id, userId: currentUserId },
            { hiddenAt: null },
          );

        return {
          conversationId: conversation.id,
          type: conversation.type,
          created: false,
        };
      }

      conversation = await conversationRepository.save(
        conversationRepository.create({
          type: ConversationType.DIRECT,
          directKey,
          createdById: currentUserId,
        }),
      );

      const memberRepository = manager.getRepository(ConversationMember);

      await memberRepository.save([
        memberRepository.create({
          conversationId: conversation.id,
          userId: userAId,
          role:
            userAId === currentUserId
              ? ConversationMemberRole.OWNER
              : ConversationMemberRole.MEMBER,
        }),
        memberRepository.create({
          conversationId: conversation.id,
          userId: userBId,
          role:
            userBId === currentUserId
              ? ConversationMemberRole.OWNER
              : ConversationMemberRole.MEMBER,
        }),
      ]);

      return {
        conversationId: conversation.id,
        type: conversation.type,
        created: true,
      };
    });
  }

  async getMessages(
    userId: string,
    conversationId: string,
    query: GetMessagesQueryDto,
  ) {
    const membership = await this.assertActiveMember(
      this.dataSource.manager,
      userId,
      conversationId,
    );
    const limit = query.limit ?? 30;
    const messagesQuery = this.dataSource
      .getRepository(Message)
      .createQueryBuilder("message")
      .leftJoinAndSelect("message.sender", "sender")
      .leftJoinAndSelect("message.replyTo", "replyTo")
      .leftJoinAndSelect("replyTo.sender", "replyToSender")
      .where("message.conversationId = :conversationId", { conversationId })
      .andWhere("message.deletedAt IS NULL")
      .orderBy("message.createdAt", "DESC")
      .take(limit + 1);

    if (membership.historyClearedAt) {
      messagesQuery.andWhere("message.createdAt > :historyClearedAt", {
        historyClearedAt: membership.historyClearedAt,
      });
    }
    if (query.before) {
      messagesQuery.andWhere("message.createdAt < :before", {
        before: query.before,
      });
    }

    const messages = await messagesQuery.getMany();
    const hasMore = messages.length > limit;

    if (hasMore) {
      messages.pop();
    }

    messages.reverse();
    return {
      items: await this.serializeMessagesForUser(userId, messages),
      hasMore,
    };
  }

  async searchMessages(
    userId: string,
    conversationId: string,
    rawQuery: string,
  ) {
    const membership = await this.assertActiveMember(
      this.dataSource.manager,
      userId,
      conversationId,
    );
    const query = rawQuery.trim();
    if (query.length < 2) return { items: [] };

    const messagesQuery = this.dataSource
      .getRepository(Message)
      .createQueryBuilder("message")
      .leftJoinAndSelect("message.sender", "sender")
      .leftJoinAndSelect("message.replyTo", "replyTo")
      .leftJoinAndSelect("replyTo.sender", "replyToSender")
      .where("message.conversationId = :conversationId", { conversationId })
      .andWhere("message.deletedAt IS NULL")
      .andWhere("message.body ILIKE :query", { query: `%${query}%` })
      .orderBy("message.createdAt", "DESC")
      .take(20);

    if (membership.historyClearedAt) {
      messagesQuery.andWhere("message.createdAt > :historyClearedAt", {
        historyClearedAt: membership.historyClearedAt,
      });
    }

    return {
      items: await this.serializeMessagesForUser(
        userId,
        await messagesQuery.getMany(),
      ),
    };
  }

  async getMessageContext(
    userId: string,
    conversationId: string,
    messageId: string,
  ) {
    const membership = await this.assertActiveMember(
      this.dataSource.manager,
      userId,
      conversationId,
    );
    const repository = this.dataSource.getRepository(Message);
    const target = await repository.findOne({
      where: { id: messageId, conversationId, deletedAt: IsNull() },
      select: { id: true, createdAt: true },
    });
    if (
      !target ||
      (membership.historyClearedAt &&
        target.createdAt <= membership.historyClearedAt)
    ) {
      throw new NotFoundException("Message not found.");
    }

    const beforeQuery = repository
      .createQueryBuilder("message")
      .leftJoinAndSelect("message.sender", "sender")
      .leftJoinAndSelect("message.replyTo", "replyTo")
      .leftJoinAndSelect("replyTo.sender", "replyToSender")
      .where("message.conversationId = :conversationId", { conversationId })
      .andWhere("message.deletedAt IS NULL")
      .andWhere("message.createdAt <= :createdAt", {
        createdAt: target.createdAt,
      })
      .orderBy("message.createdAt", "DESC")
      .take(20);
    const afterQuery = repository
      .createQueryBuilder("message")
      .leftJoinAndSelect("message.sender", "sender")
      .leftJoinAndSelect("message.replyTo", "replyTo")
      .leftJoinAndSelect("replyTo.sender", "replyToSender")
      .where("message.conversationId = :conversationId", { conversationId })
      .andWhere("message.deletedAt IS NULL")
      .andWhere("message.createdAt > :createdAt", {
        createdAt: target.createdAt,
      })
      .orderBy("message.createdAt", "ASC")
      .take(20);

    for (const query of [beforeQuery, afterQuery]) {
      if (membership.historyClearedAt) {
        query.andWhere("message.createdAt > :historyClearedAt", {
          historyClearedAt: membership.historyClearedAt,
        });
      }
    }
    const context = [
      ...(await beforeQuery.getMany()).reverse(),
      ...(await afterQuery.getMany()),
    ];
    return { items: await this.serializeMessagesForUser(userId, context) };
  }

  private async serializeMessagesForUser(userId: string, messages: Message[]) {
    const messageIds = messages.map((message) => message.id);
    const attachmentsByMessageId =
      await this.mediaService.getSerializedAttachmentsByMessageIds(messageIds);
    const profileUserIds = messages.flatMap((message) => [
      ...(message.senderId ? [message.senderId] : []),
      ...(message.replyTo?.senderId ? [message.replyTo.senderId] : []),
    ]);
    const [visibleProfileUserIds, profileAvatarUrls, reactionRows] =
      await Promise.all([
        this.profileVisibilityService.getVisibleProfileUserIds(
          userId,
          profileUserIds,
        ),
        this.profileVisibilityService.getAvatarUrls(profileUserIds),
        messageIds.length
          ? this.dataSource
              .getRepository(MessageReaction)
              .find({ where: { messageId: In(messageIds) } })
          : Promise.resolve([]),
      ]);
    const reactionsByMessageId = this.serializeReactionSummaries(
      reactionRows,
      userId,
    );
    return messages.map((message) =>
      this.serializeMessage(
        message,
        reactionsByMessageId.get(message.id) ?? [],
        visibleProfileUserIds,
        profileAvatarUrls,
        attachmentsByMessageId,
      ),
    );
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    dto: CreateMessageDto,
    files: ConversationUploadFile[] = [],
  ) {
    const body = dto.body?.trim() ?? "";

    if (!body && files.length === 0) {
      throw new BadRequestException("Write a message or attach an image.");
    }

    // Upload se pehle membership check; Storage request DB transaction ke bahar rahegi.
    await this.dataSource.transaction((manager) =>
      this.assertActiveMember(manager, userId, conversationId),
    );
    if (
      dto.audioWaveform &&
      (files.length !== 1 || !files[0].mimetype.startsWith("audio/"))
    ) {
      throw new BadRequestException(
        "A waveform can only be sent with one audio attachment.",
      );
    }
    const uploadedImages = await this.mediaService.uploadMedia(
      conversationId,
      userId,
      files,
      dto.audioWaveform,
    );
    let message: Message;

    try {
      message = await this.dataSource.transaction(async (manager) => {
        await this.assertActiveMember(manager, userId, conversationId);

        const messageRepository = manager.getRepository(Message);
        const replyToMessageId = dto.replyToMessageId ?? null;

        if (replyToMessageId) {
          const replyTarget = await messageRepository.findOne({
            where: {
              id: replyToMessageId,
              conversationId,
              deletedAt: IsNull(),
            },
            select: { id: true },
          });

          if (!replyTarget) {
            throw new BadRequestException(
              "The message you are replying to was not found in this conversation.",
            );
          }
        }

        const savedMessage = await messageRepository.save(
          messageRepository.create({
            conversationId,
            senderId: userId,
            type:
              uploadedImages.length > 0 ? MessageType.MEDIA : MessageType.TEXT,
            body: body || null,
            replyToMessageId,
          }),
        );

        if (uploadedImages.length > 0) {
          const attachmentRepository = manager.getRepository(MessageAttachment);

          await attachmentRepository.save(
            uploadedImages.map((image) =>
              attachmentRepository.create({
                messageId: savedMessage.id,
                type: image.type,
                storagePath: image.storagePath,
                originalName: image.originalName,
                mimeType: image.mimeType,
                sizeBytes: image.sizeBytes,
                waveform: image.waveform ?? null,
              }),
            ),
          );
        }

        await manager.getRepository(ConversationMember).update(
          {
            conversationId,
            leftAt: IsNull(),
          },
          { hiddenAt: null },
        );

        await manager
          .getRepository(Conversation)
          .update({ id: conversationId }, { updatedAt: new Date() });

        const messageWithRelations = await messageRepository.findOne({
          where: { id: savedMessage.id },
          relations: {
            sender: true,
            replyTo: { sender: true },
          },
        });

        if (!messageWithRelations) {
          throw new NotFoundException(
            "Could not load the message after saving.",
          );
        }

        return messageWithRelations;
      });
    } catch (error) {
      await this.mediaService.deleteStorageObjects(
        uploadedImages.map((image) => image.storagePath),
      );
      throw error;
    }

    const profileUserIds = [
      ...(message.senderId ? [message.senderId] : []),
      ...(message.replyTo?.senderId ? [message.replyTo.senderId] : []),
    ];

    const visibleProfileUserIds =
      await this.profileVisibilityService.getVisibleProfileUserIds(
        userId,
        profileUserIds,
      );

    const profileAvatarUrls =
      await this.profileVisibilityService.getAvatarUrls(profileUserIds);

    const attachmentsByMessageId =
      await this.mediaService.getSerializedAttachmentsByMessageIds([
        message.id,
      ]);

    const serializedMessage = this.serializeMessage(
      message,
      [],
      visibleProfileUserIds,
      profileAvatarUrls,
      attachmentsByMessageId,
    );

    this.conversationsGateway.emitMessage(conversationId, serializedMessage);

    return serializedMessage;
  }
  async updateMessage(
    userId: string,
    conversationId: string,
    messageId: string,
    dto: UpdateMessageDto,
  ) {
    const body = dto.body.trim();

    if (!body) {
      throw new BadRequestException("Message cannot be empty.");
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const membership = await this.assertActiveMember(
        manager,
        userId,
        conversationId,
      );

      const messageRepository = manager.getRepository(Message);
      const message = await messageRepository.findOne({
        where: {
          id: messageId,
          conversationId,
          deletedAt: IsNull(),
        },
        select: {
          id: true,
          senderId: true,
          body: true,
          createdAt: true,
        },
        lock: { mode: "pessimistic_write" },
      });

      if (
        !message ||
        (membership.historyClearedAt &&
          message.createdAt <= membership.historyClearedAt)
      ) {
        throw new NotFoundException("Message not found.");
      }

      if (message.senderId !== userId) {
        throw new ForbiddenException("You can only edit your own messages.");
      }

      if (message.body == null) {
        throw new BadRequestException(
          "Only messages containing text can be edited.",
        );
      }

      message.body = body;
      message.editedAt = new Date();

      await messageRepository.save(message);

      return {
        conversationId,
        messageId,
        body: message.body,
        editedAt: message.editedAt,
      };
    });

    this.conversationsGateway.emitMessageUpdated(result);

    return result;
  }

  async deleteMessage(
    userId: string,
    conversationId: string,
    messageId: string,
  ) {
    const storagePaths: string[] = [];

    const result = await this.dataSource.transaction(async (manager) => {
      const membership = await this.assertActiveMember(
        manager,
        userId,
        conversationId,
      );

      const messageRepository = manager.getRepository(Message);
      const message = await messageRepository.findOne({
        where: {
          id: messageId,
          conversationId,
          deletedAt: IsNull(),
        },
        select: {
          id: true,
          senderId: true,
          createdAt: true,
        },
        lock: { mode: "pessimistic_write" },
      });

      if (
        !message ||
        (membership.historyClearedAt &&
          message.createdAt <= membership.historyClearedAt)
      ) {
        throw new NotFoundException("Message not found.");
      }

      if (message.senderId !== userId) {
        throw new ForbiddenException("You can only delete your own messages.");
      }

      const attachments = await manager.getRepository(MessageAttachment).find({
        where: { messageId },
        select: { storagePath: true },
      });

      storagePaths.push(
        ...attachments.map((attachment) => attachment.storagePath),
      );

      message.deletedAt = new Date();
      message.body = null;
      await messageRepository.save(message);

      await manager.getRepository(MessageReaction).delete({ messageId });
      await manager.getRepository(MessageAttachment).delete({ messageId });

      return { conversationId, messageId };
    });

    await this.mediaService.deleteStorageObjects(storagePaths);
    this.conversationsGateway.emitMessageDeleted(result);

    return { ...result, deletedForEveryone: true };
  }
  async toggleMessageReaction(
    userId: string,
    conversationId: string,
    messageId: string,
    emoji: string,
  ) {
    const result = await this.dataSource.transaction(async (manager) => {
      const membership = await this.assertActiveMember(
        manager,
        userId,
        conversationId,
      );

      const message = await manager.getRepository(Message).findOne({
        where: {
          id: messageId,
          conversationId,
          deletedAt: IsNull(),
        },
        select: {
          id: true,
          createdAt: true,
        },
        lock: { mode: "pessimistic_write" },
      });

      if (
        !message ||
        (membership.historyClearedAt &&
          message.createdAt <= membership.historyClearedAt)
      ) {
        throw new NotFoundException("Message not found.");
      }

      const reactionRepository = manager.getRepository(MessageReaction);
      const existingReaction = await reactionRepository.findOne({
        where: { messageId, userId },
      });

      if (existingReaction) {
        if (existingReaction.emoji === emoji) {
          await reactionRepository.remove(existingReaction);
        } else {
          existingReaction.emoji = emoji;
          await reactionRepository.save(existingReaction);
        }
      } else {
        await reactionRepository.save(
          reactionRepository.create({
            messageId,
            userId,
            emoji,
          }),
        );
      }

      const reactionRows = await reactionRepository.find({
        where: { messageId },
      });
      const reactionsByMessageId = this.serializeReactionSummaries(
        reactionRows,
        userId,
      );

      return {
        conversationId,
        messageId,
        reactions: reactionsByMessageId.get(messageId) ?? [],
      };
    });

    this.conversationsGateway.emitReactionUpdated(conversationId, result);

    return result;
  }

  private serializeReactionSummaries(
    reactionRows: MessageReaction[],
    currentUserId: string,
  ) {
    const grouped = new Map<string, Map<string, SerializedReaction>>();

    for (const reaction of reactionRows) {
      let reactionsForMessage = grouped.get(reaction.messageId);

      if (!reactionsForMessage) {
        reactionsForMessage = new Map<string, SerializedReaction>();
        grouped.set(reaction.messageId, reactionsForMessage);
      }

      let summary = reactionsForMessage.get(reaction.emoji);

      if (!summary) {
        summary = {
          emoji: reaction.emoji,
          count: 0,
          reactedByMe: false,
        };
        reactionsForMessage.set(reaction.emoji, summary);
      }

      summary.count += 1;

      if (reaction.userId === currentUserId) {
        summary.reactedByMe = true;
      }
    }

    return new Map(
      [...grouped].map(([messageId, reactions]) => [
        messageId,
        [...reactions.values()].sort((first, second) =>
          first.emoji.localeCompare(second.emoji),
        ),
      ]),
    );
  }

  private async assertActiveGroupOwner(
    manager: EntityManager,
    userId: string,
    conversationId: string,
  ) {
    const conversation = await manager.getRepository(Conversation).findOne({
      where: {
        id: conversationId,
        type: ConversationType.GROUP,
        deletedAt: IsNull(),
      },
      lock: { mode: "pessimistic_write" },
    });

    if (!conversation) {
      throw new NotFoundException("Group not found.");
    }

    const ownerMembership = await manager
      .getRepository(ConversationMember)
      .findOne({
        where: {
          conversationId,
          userId,
          role: ConversationMemberRole.OWNER,
          leftAt: IsNull(),
        },
        lock: { mode: "pessimistic_write" },
      });

    if (!ownerMembership) {
      throw new ForbiddenException(
        "Only the group owner can manage group members.",
      );
    }

    return conversation;
  }

  private async assertActiveMember(
    manager: EntityManager,
    userId: string,
    conversationId: string,
  ) {
    const membership = await manager.getRepository(ConversationMember).findOne({
      where: {
        conversationId,
        userId,
        leftAt: IsNull(),
      },
      select: {
        id: true,
        historyClearedAt: true,
      },
    });

    if (!membership) {
      throw new NotFoundException("Conversation not found.");
    }
    return membership;
  }

  private serializeMessage(
    message: Message,
    reactions: SerializedReaction[] = [],
    visibleProfileUserIds: ReadonlySet<string> = new Set<string>(),
    profileAvatarUrls: ReadonlyMap<string, string | null> = new Map(),
    attachmentsByMessageId: ReadonlyMap<
      string,
      SerializedMessageAttachment[]
    > = new Map(),
  ) {
    const replyTo =
      message.replyTo && !message.replyTo.deletedAt
        ? {
            id: message.replyTo.id,
            body: message.replyTo.body ?? null,
            sender: this.profileVisibilityService.serializeProfile(
              message.replyTo.sender
                ? {
                    id: message.replyTo.sender.id,
                    username: message.replyTo.sender.username,
                    displayName: message.replyTo.sender.displayName,
                    avatarUrl:
                      profileAvatarUrls.get(message.replyTo.sender.id) ??
                      message.replyTo.sender.avatarUrl ??
                      null,
                  }
                : null,
              visibleProfileUserIds,
            ),
          }
        : null;

    return {
      id: message.id,
      conversationId: message.conversationId,
      type: message.type,
      body: message.body ?? null,
      createdAt: message.createdAt,
      editedAt: message.editedAt ?? null,
      sender: this.profileVisibilityService.serializeProfile(
        message.sender
          ? {
              id: message.sender.id,
              username: message.sender.username,
              displayName: message.sender.displayName,
              avatarUrl:
                profileAvatarUrls.get(message.sender.id) ??
                message.sender.avatarUrl ??
                null,
            }
          : null,
        visibleProfileUserIds,
      ),
      replyTo,
      attachments: attachmentsByMessageId.get(message.id) ?? [],
      reactions,
    };
  }

  async createGroupConversation(
    creatorId: string,
    dto: CreateGroupConversationDto,
  ) {
    const memberIds = dto.memberIds;

    if (memberIds.includes(creatorId)) {
      throw new BadRequestException(
        "You are automatically added to the group.",
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const friendships = await manager
        .getRepository(Friendship)
        .createQueryBuilder("friendship")
        .where(
          `(
          friendship.userAId = :creatorId
          AND friendship.userBId IN (:...memberIds)
        ) OR (
          friendship.userBId = :creatorId
          AND friendship.userAId IN (:...memberIds)
        )`,
          { creatorId, memberIds },
        )
        .setLock("pessimistic_write")
        .getMany();

      if (friendships.length !== memberIds.length) {
        throw new ForbiddenException(
          "You can only add your friends to a group.",
        );
      }

      const conversationRepository = manager.getRepository(Conversation);
      const conversation = await conversationRepository.save(
        conversationRepository.create({
          type: ConversationType.GROUP,
          title: dto.title.trim(),
          createdById: creatorId,
        }),
      );

      const allMemberIds = [creatorId, ...memberIds];
      const memberRepository = manager.getRepository(ConversationMember);

      await memberRepository.save(
        allMemberIds.map((userId, index) =>
          memberRepository.create({
            conversationId: conversation.id,
            userId,
            role:
              index === 0
                ? ConversationMemberRole.OWNER
                : ConversationMemberRole.MEMBER,
          }),
        ),
      );

      return {
        conversationId: conversation.id,
        participantIds: allMemberIds,
      };
    });

    this.conversationsGateway.emitConversationCreated(
      result.participantIds,
      result.conversationId,
    );

    return {
      conversationId: result.conversationId,
      type: ConversationType.GROUP,
      created: true,
    };
  }

  async addGroupMembers(
    ownerId: string,
    conversationId: string,
    dto: AddGroupMembersDto,
  ) {
    if (dto.memberIds.includes(ownerId)) {
      throw new BadRequestException("You are already a member of this group.");
    }

    const result = await this.dataSource.transaction(async (manager) => {
      await this.assertActiveGroupOwner(manager, ownerId, conversationId);

      const memberRepository = manager.getRepository(ConversationMember);

      const activeMembers = await memberRepository.find({
        where: {
          conversationId,
          leftAt: IsNull(),
        },
        select: { userId: true },
      });

      const activeMemberIds = new Set(
        activeMembers.map((member) => member.userId),
      );

      const memberIdsToAdd = dto.memberIds.filter(
        (memberId) => !activeMemberIds.has(memberId),
      );

      if (memberIdsToAdd.length === 0) {
        throw new BadRequestException(
          "All selected users are already in this group.",
        );
      }

      if (activeMembers.length + memberIdsToAdd.length > 50) {
        throw new BadRequestException(
          "A group can have at most 50 active members.",
        );
      }

      const friendships = await manager
        .getRepository(Friendship)
        .createQueryBuilder("friendship")
        .where(
          `(
          friendship.userAId = :ownerId
          AND friendship.userBId IN (:...memberIds)
        ) OR (
          friendship.userBId = :ownerId
          AND friendship.userAId IN (:...memberIds)
        )`,
          { ownerId, memberIds: memberIdsToAdd },
        )
        .getMany();

      if (friendships.length !== memberIdsToAdd.length) {
        throw new ForbiddenException(
          "You can only add your friends to a group.",
        );
      }

      const previousMemberships = await memberRepository.find({
        where: {
          conversationId,
          userId: In(memberIdsToAdd),
        },
        select: { userId: true, leftAt: true },
        order: { joinedAt: "DESC" },
      });
      const historyCutoffByUser = new Map<string, Date>();

      for (const previousMembership of previousMemberships) {
        if (
          previousMembership.leftAt &&
          !historyCutoffByUser.has(previousMembership.userId)
        ) {
          historyCutoffByUser.set(
            previousMembership.userId,
            previousMembership.leftAt,
          );
        }
      }

      await memberRepository.save(
        memberIdsToAdd.map((userId) =>
          memberRepository.create({
            conversationId,
            userId,
            role: ConversationMemberRole.MEMBER,
            historyClearedAt: historyCutoffByUser.get(userId) ?? null,
          }),
        ),
      );

      return {
        addedMemberIds: memberIdsToAdd,
        participantIds: [...activeMemberIds, ...memberIdsToAdd],
      };
    });

    this.conversationsGateway.emitConversationMembersChanged(
      result.participantIds,
      conversationId,
    );

    return {
      conversationId,
      addedMemberIds: result.addedMemberIds,
    };
  }

  async deleteConversation(userId: string, conversationId: string) {
    const result = await this.dataSource.transaction(async (manager) => {
      const conversationRepository = manager.getRepository(Conversation);

      const conversation = await conversationRepository.findOne({
        where: {
          id: conversationId,
          deletedAt: IsNull(),
        },
        lock: { mode: "pessimistic_write" },
      });

      if (!conversation) {
        throw new NotFoundException("Conversation not found.");
      }

      const memberRepository = manager.getRepository(ConversationMember);

      const membership = await memberRepository.findOne({
        where: {
          conversationId,
          userId,
          leftAt: IsNull(),
        },
        lock: { mode: "pessimistic_write" },
      });

      if (!membership) {
        throw new NotFoundException("Conversation not found.");
      }

      if (conversation.type === ConversationType.DIRECT) {
        const clearedAt = new Date();

        await memberRepository.update(membership.id, {
          hiddenAt: clearedAt,
          historyClearedAt: clearedAt,
        });

        return {
          deletedForAll: false,
          participantIds: [userId],
        };
      }
      throw new BadRequestException("This conversation cannot be deleted.");
    });

    this.conversationsGateway.emitConversationDeleted(
      result.participantIds,
      conversationId,
    );

    return {
      conversationId,
      deletedForAll: result.deletedForAll,
    };
  }

  async clearConversationHistory(userId: string, conversationId: string) {
    await this.dataSource.transaction(async (manager) => {
      const conversation = await manager.getRepository(Conversation).findOne({
        where: { id: conversationId, deletedAt: IsNull() },
        select: { id: true, type: true },
        lock: { mode: "pessimistic_write" },
      });

      if (!conversation) {
        throw new NotFoundException("Conversation not found.");
      }

      if (
        conversation.type !== ConversationType.GROUP &&
        conversation.type !== ConversationType.WORLD
      ) {
        throw new BadRequestException(
          "Use remove chat to clear a direct conversation.",
        );
      }

      const membership = await manager
        .getRepository(ConversationMember)
        .findOne({
          where: {
            conversationId,
            userId,
            leftAt: IsNull(),
          },
          lock: { mode: "pessimistic_write" },
        });

      if (!membership) {
        throw new NotFoundException("Conversation not found.");
      }

      await manager.getRepository(ConversationMember).update(membership.id, {
        historyClearedAt: new Date(),
      });
    });

    return { conversationId, clearedForMe: true };
  }

  async deleteGroupForEveryone(userId: string, conversationId: string) {
    const result = await this.dataSource.transaction(async (manager) => {
      const conversationRepository = manager.getRepository(Conversation);
      const conversation = await conversationRepository.findOne({
        where: {
          id: conversationId,
          type: ConversationType.GROUP,
          deletedAt: IsNull(),
        },
        lock: { mode: "pessimistic_write" },
      });

      if (!conversation) {
        throw new NotFoundException("Group not found.");
      }

      const membership = await manager
        .getRepository(ConversationMember)
        .findOne({
          where: {
            conversationId,
            userId,
            role: ConversationMemberRole.OWNER,
            leftAt: IsNull(),
          },
          lock: { mode: "pessimistic_write" },
        });

      if (!membership) {
        throw new ForbiddenException(
          "Only the group owner can delete this group for everyone.",
        );
      }

      const activeMembers = await manager
        .getRepository(ConversationMember)
        .find({
          where: { conversationId, leftAt: IsNull() },
          select: { userId: true },
        });
      const mediaStoragePaths = await this.getGroupMediaStoragePaths(
        manager,
        conversationId,
      );

      await conversationRepository.delete(conversationId);

      return {
        participantIds: activeMembers.map((member) => member.userId),
        mediaStoragePaths,
        avatarStoragePath: conversation.avatarStoragePath ?? null,
      };
    });

    await this.cleanupDeletedGroupStorage(
      result.mediaStoragePaths,
      result.avatarStoragePath,
    );
    this.conversationsGateway.emitConversationDeleted(
      result.participantIds,
      conversationId,
    );

    return { conversationId, deletedForAll: true };
  }

  private async getGroupMediaStoragePaths(
    manager: EntityManager,
    conversationId: string,
  ) {
    const attachments = await manager
      .getRepository(MessageAttachment)
      .createQueryBuilder("attachment")
      .innerJoin("attachment.message", "message")
      .select("attachment.storagePath", "storagePath")
      .where("message.conversationId = :conversationId", { conversationId })
      .getRawMany<{ storagePath: string }>();

    return attachments.map((attachment) => attachment.storagePath);
  }

  private async cleanupDeletedGroupStorage(
    mediaStoragePaths: string[],
    avatarStoragePath: string | null,
  ) {
    await Promise.all([
      this.mediaService.deleteStorageObjects(mediaStoragePaths),
      this.groupAvatarService.deleteStoredAvatar(avatarStoragePath),
    ]);
  }

  async updateGroupSettings(
    userId: string,
    conversationId: string,
    dto: UpdateGroupSettingsDto,
  ) {
    const hasChanges = [dto.title, dto.description, dto.avatarUrl].some(
      (value) => value !== undefined,
    );

    if (!hasChanges) {
      throw new BadRequestException(
        "Provide at least one group setting to update.",
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const conversationRepository = manager.getRepository(Conversation);

      const conversation = await this.assertActiveGroupOwner(
        manager,
        userId,
        conversationId,
      );

      const ownerMembership = await manager
        .getRepository(ConversationMember)
        .findOne({
          where: {
            conversationId,
            userId,
            role: ConversationMemberRole.OWNER,
            leftAt: IsNull(),
          },
          lock: { mode: "pessimistic_write" },
        });

      if (!ownerMembership) {
        throw new ForbiddenException(
          "Only the group owner can update group settings.",
        );
      }

      const updates: Partial<
        Pick<Conversation, "title" | "description" | "avatarUrl">
      > = {};

      if (dto.title !== undefined) {
        updates.title = dto.title.trim();
      }

      if (dto.description !== undefined) {
        updates.description = dto.description?.trim() || null;
      }

      if (dto.avatarUrl !== undefined) {
        updates.avatarUrl = dto.avatarUrl;
      }

      await conversationRepository.update(conversationId, {
        ...updates,
        updatedAt: new Date(),
      });

      return {
        conversationId,
        title: updates.title ?? conversation.title ?? null,
        description:
          updates.description !== undefined
            ? updates.description
            : (conversation.description ?? null),
        avatarUrl:
          updates.avatarUrl !== undefined
            ? updates.avatarUrl
            : (conversation.avatarUrl ?? null),
      };
    });
  }

  async removeGroupMember(
    ownerId: string,
    conversationId: string,
    memberId: string,
  ) {
    if (ownerId === memberId) {
      throw new BadRequestException(
        "Use the leave-group action to leave the group.",
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      await this.assertActiveGroupOwner(manager, ownerId, conversationId);

      const memberRepository = manager.getRepository(ConversationMember);

      const targetMembership = await memberRepository.findOne({
        where: {
          conversationId,
          userId: memberId,
          leftAt: IsNull(),
        },
        lock: { mode: "pessimistic_write" },
      });

      if (!targetMembership) {
        throw new NotFoundException("Active group member not found.");
      }

      if (targetMembership.role === ConversationMemberRole.OWNER) {
        throw new BadRequestException("The group owner cannot be removed.");
      }

      await memberRepository.update(targetMembership.id, {
        leftAt: new Date(),
      });

      const remainingMembers = await memberRepository.find({
        where: {
          conversationId,
          leftAt: IsNull(),
        },
        select: { userId: true },
      });

      return {
        participantIds: [
          ...remainingMembers.map((member) => member.userId),
          memberId,
        ],
      };
    });

    this.conversationsGateway.emitConversationMembersChanged(
      result.participantIds,
      conversationId,
    );

    return {
      conversationId,
      removedMemberId: memberId,
    };
  }

  async leaveGroup(userId: string, conversationId: string) {
    const result = await this.dataSource.transaction(async (manager) => {
      const conversation = await manager.getRepository(Conversation).findOne({
        where: {
          id: conversationId,
          type: ConversationType.GROUP,
          deletedAt: IsNull(),
        },
        lock: { mode: "pessimistic_write" },
      });

      if (!conversation) {
        throw new NotFoundException("Group not found.");
      }

      const memberRepository = manager.getRepository(ConversationMember);

      const activeMembers = await memberRepository
        .createQueryBuilder("member")
        .where("member.conversationId = :conversationId", {
          conversationId,
        })
        .andWhere("member.leftAt IS NULL")
        .orderBy("member.joinedAt", "ASC")
        .setLock("pessimistic_write")
        .getMany();

      const currentMembership = activeMembers.find(
        (member) => member.userId === userId,
      );

      if (!currentMembership) {
        throw new NotFoundException("You are not an active group member.");
      }

      const otherMembers = activeMembers.filter(
        (member) => member.userId !== userId,
      );

      let newOwnerId: string | null = null;
      let groupDeleted = false;
      let deletedMediaStoragePaths: string[] = [];
      let deletedAvatarStoragePath: string | null = null;

      if (otherMembers.length === 0) {
        deletedMediaStoragePaths = await this.getGroupMediaStoragePaths(
          manager,
          conversationId,
        );
        deletedAvatarStoragePath = conversation.avatarStoragePath ?? null;
        await manager.getRepository(Conversation).delete(conversationId);
        groupDeleted = true;
      } else if (currentMembership.role === ConversationMemberRole.OWNER) {
        const nextOwner = otherMembers[0];

        await memberRepository.update(nextOwner.id, {
          role: ConversationMemberRole.OWNER,
        });
        newOwnerId = nextOwner.userId;
      }

      if (!groupDeleted) {
        await memberRepository.update(currentMembership.id, {
          leftAt: new Date(),
        });
      }

      return {
        participantIds: [
          ...otherMembers.map((member) => member.userId),
          userId,
        ],
        newOwnerId,
        groupDeleted,
        deletedMediaStoragePaths,
        deletedAvatarStoragePath,
      };
    });

    if (result.groupDeleted) {
      await this.cleanupDeletedGroupStorage(
        result.deletedMediaStoragePaths,
        result.deletedAvatarStoragePath,
      );
      this.conversationsGateway.emitConversationDeleted(
        result.participantIds,
        conversationId,
      );
    } else {
      this.conversationsGateway.emitConversationMembersChanged(
        result.participantIds,
        conversationId,
      );
    }

    return {
      conversationId,
      left: true,
      newOwnerId: result.newOwnerId,
      groupDeleted: result.groupDeleted,
    };
  }
}
