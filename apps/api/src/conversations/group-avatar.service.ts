import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DataSource, IsNull } from "typeorm";

import {
  Conversation,
  ConversationType,
} from "../database/entities/conversation.entity";
import {
  ConversationMember,
  ConversationMemberRole,
} from "../database/entities/conversation-member.entity";
import { SupabaseStorageService } from "../infrastructure/supabase-storage.service";
import { ConversationsGateway } from "./conversations.gateway";

export interface GroupAvatarFile {
  buffer: Buffer;
  mimetype: string;
}

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

const AVATAR_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

@Injectable()
export class GroupAvatarService {
  private readonly logger = new Logger(GroupAvatarService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly storageService: SupabaseStorageService,
    private readonly conversationsGateway: ConversationsGateway,
  ) {}

  async upload(userId: string, conversationId: string, file: GroupAvatarFile) {
    this.validateImage(file);

    const conversation = await this.getOwnedGroup(userId, conversationId);
    const extension = AVATAR_EXTENSIONS[file.mimetype];
    const storagePath = `group-avatars/${conversationId}/${randomUUID()}.${extension}`;

    await this.storageService.uploadObject(
      storagePath,
      file.buffer,
      file.mimetype,
    );

    const previousStoragePath = conversation.avatarStoragePath ?? null;

    conversation.avatarStoragePath = storagePath;
    conversation.avatarUrl = null;

    try {
      await this.dataSource.getRepository(Conversation).save(conversation);
    } catch (error) {
      try {
        await this.storageService.deleteObject(storagePath);
      } catch {
        this.logger.warn("Could not clean up an unused group avatar upload.");
      }

      throw error;
    }

    if (previousStoragePath) {
      try {
        await this.storageService.deleteObject(previousStoragePath);
      } catch (error) {
        this.logger.warn(
          `Could not remove replaced avatar for group ${conversationId}.`,
          error instanceof Error ? error.message : undefined,
        );
      }
    }

    this.notifyGroupMembers(conversationId);

    return {
      conversationId,
      avatarUrl: await this.getAvatarUrl(conversation),
    };
  }

  async remove(userId: string, conversationId: string) {
    const conversation = await this.getOwnedGroup(userId, conversationId);
    const previousStoragePath = conversation.avatarStoragePath ?? null;

    conversation.avatarStoragePath = null;
    conversation.avatarUrl = null;

    await this.dataSource.getRepository(Conversation).save(conversation);

    if (previousStoragePath) {
      try {
        await this.storageService.deleteObject(previousStoragePath);
      } catch (error) {
        this.logger.warn(
          `Could not remove avatar for group ${conversationId}.`,
          error instanceof Error ? error.message : undefined,
        );
      }
    }

    this.notifyGroupMembers(conversationId);

    return {
      conversationId,
      avatarUrl: null,
    };
  }

  async getAvatarUrl(conversation: Conversation): Promise<string | null> {
    if (conversation.avatarStoragePath) {
      return this.storageService.createSignedUrl(
        conversation.avatarStoragePath,
      );
    }

    return conversation.avatarUrl ?? null;
  }

  async deleteStoredAvatar(storagePath: string | null | undefined) {
    if (!storagePath) {
      return;
    }

    try {
      await this.storageService.deleteObject(storagePath);
    } catch (error) {
      this.logger.warn(
        `Could not remove deleted group avatar "${storagePath}".`,
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  private async getOwnedGroup(userId: string, conversationId: string) {
    const conversation = await this.dataSource
      .getRepository(Conversation)
      .findOne({
        where: {
          id: conversationId,
          type: ConversationType.GROUP,
          deletedAt: IsNull(),
        },
      });

    if (!conversation) {
      throw new NotFoundException("Group not found.");
    }

    const ownerMembership = await this.dataSource
      .getRepository(ConversationMember)
      .findOne({
        where: {
          conversationId,
          userId,
          role: ConversationMemberRole.OWNER,
          leftAt: IsNull(),
        },
        select: { id: true },
      });

    if (!ownerMembership) {
      throw new ForbiddenException(
        "Only the group owner can update the group avatar.",
      );
    }

    return conversation;
  }

  private validateImage(file: GroupAvatarFile) {
    const extension = AVATAR_EXTENSIONS[file.mimetype];

    if (!extension) {
      throw new BadRequestException(
        "Group avatar must be a JPEG, PNG, or WebP image.",
      );
    }

    if (!file.buffer?.length || file.buffer.length > MAX_AVATAR_SIZE_BYTES) {
      throw new BadRequestException("Group avatar must be 5 MB or smaller.");
    }

    const isValidSignature =
      file.mimetype === "image/jpeg"
        ? file.buffer.length >= 3 &&
          file.buffer[0] === 0xff &&
          file.buffer[1] === 0xd8 &&
          file.buffer[2] === 0xff
        : file.mimetype === "image/png"
          ? file.buffer.length >= 8 &&
            file.buffer
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : file.buffer.length >= 12 &&
            file.buffer.toString("ascii", 0, 4) === "RIFF" &&
            file.buffer.toString("ascii", 8, 12) === "WEBP";

    if (!isValidSignature) {
      throw new BadRequestException(
        "The uploaded file does not match its image type.",
      );
    }

    return extension;
  }

  private async notifyGroupMembers(conversationId: string) {
    const members = await this.dataSource
      .getRepository(ConversationMember)
      .find({
        where: {
          conversationId,
          leftAt: IsNull(),
        },
        select: { userId: true },
      });

    this.conversationsGateway.emitConversationMembersChanged(
      members.map((member) => member.userId),
      conversationId,
    );
  }
}
