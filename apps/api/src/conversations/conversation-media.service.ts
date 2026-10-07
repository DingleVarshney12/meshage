import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DataSource, In } from "typeorm";

import {
  AttachmentType,
  MessageAttachment,
} from "../database/entities/message-attachment.entity";
import { SupabaseStorageService } from "../infrastructure/supabase-storage.service";

export interface ConversationUploadFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface UploadedConversationAttachment {
  type: AttachmentType;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  waveform?: number[] | null;
}

export interface SerializedMessageAttachment {
  id: string;
  type: AttachmentType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  waveform: number[] | null;
}

interface MediaTypeConfig {
  type: AttachmentType;
  extension: string;
  maxSizeBytes: number;
}

export const MAX_ATTACHMENTS_PER_MESSAGE = 5;
export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 25 * 1024 * 1024;

const MEDIA_TYPES: Record<string, MediaTypeConfig> = {
  "image/jpeg": {
    type: AttachmentType.IMAGE,
    extension: "jpg",
    maxSizeBytes: MAX_IMAGE_SIZE_BYTES,
  },
  "image/png": {
    type: AttachmentType.IMAGE,
    extension: "png",
    maxSizeBytes: MAX_IMAGE_SIZE_BYTES,
  },
  "image/webp": {
    type: AttachmentType.IMAGE,
    extension: "webp",
    maxSizeBytes: MAX_IMAGE_SIZE_BYTES,
  },
  "video/mp4": {
    type: AttachmentType.VIDEO,
    extension: "mp4",
    maxSizeBytes: MAX_VIDEO_SIZE_BYTES,
  },
  "video/webm": {
    type: AttachmentType.VIDEO,
    extension: "webm",
    maxSizeBytes: MAX_VIDEO_SIZE_BYTES,
  },
  "audio/mpeg": {
    type: AttachmentType.AUDIO,
    extension: "mp3",
    maxSizeBytes: MAX_AUDIO_SIZE_BYTES,
  },
  "audio/mp4": {
    type: AttachmentType.AUDIO,
    extension: "m4a",
    maxSizeBytes: MAX_AUDIO_SIZE_BYTES,
  },
  "audio/wav": {
    type: AttachmentType.AUDIO,
    extension: "wav",
    maxSizeBytes: MAX_AUDIO_SIZE_BYTES,
  },
  "audio/ogg": {
    type: AttachmentType.AUDIO,
    extension: "ogg",
    maxSizeBytes: MAX_AUDIO_SIZE_BYTES,
  },
  "audio/webm": {
    type: AttachmentType.AUDIO,
    extension: "webm",
    maxSizeBytes: MAX_AUDIO_SIZE_BYTES,
  },
  "application/pdf": {
    type: AttachmentType.FILE,
    extension: "pdf",
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
  },
};

@Injectable()
export class ConversationMediaService {
  private readonly logger = new Logger(ConversationMediaService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly storageService: SupabaseStorageService,
  ) {}

  async uploadMedia(
    conversationId: string,
    userId: string,
    files: ConversationUploadFile[],
    waveform?: number[],
  ): Promise<UploadedConversationAttachment[]> {
    if (files.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new BadRequestException(
        `You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files to one message.`,
      );
    }

    const configs = files.map((file) => this.validateMedia(file));
    const uploadedAttachments: UploadedConversationAttachment[] = [];

    try {
      for (const [index, file] of files.entries()) {
        const config = configs[index];
        const storagePath =
          `conversation-media/${conversationId}/${userId}/` +
          `${randomUUID()}.${config.extension}`;

        await this.storageService.uploadObject(
          storagePath,
          file.buffer,
          file.mimetype,
        );

        uploadedAttachments.push({
          type: config.type,
          storagePath,
          originalName: this.sanitizeFileName(
            file.originalname,
            config.extension,
          ),
          mimeType: file.mimetype,
          sizeBytes: file.buffer.length,
          waveform:
            config.type === AttachmentType.AUDIO ? (waveform ?? null) : null,
        });
      }

      return uploadedAttachments;
    } catch (error) {
      await this.deleteStorageObjects(
        uploadedAttachments.map((attachment) => attachment.storagePath),
      );
      throw error;
    }
  }

  async serializeAttachments(
    attachments: MessageAttachment[],
  ): Promise<SerializedMessageAttachment[]> {
    return Promise.all(
      attachments.map(async (attachment) => ({
        id: attachment.id,
        type: attachment.type,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        url: await this.storageService.createSignedUrl(attachment.storagePath),
        waveform: attachment.waveform ?? null,
      })),
    );
  }

  async getSerializedAttachmentsByMessageIds(
    messageIds: string[],
  ): Promise<Map<string, SerializedMessageAttachment[]>> {
    const uniqueMessageIds = [...new Set(messageIds)];

    if (uniqueMessageIds.length === 0) {
      return new Map();
    }

    const attachments = await this.dataSource
      .getRepository(MessageAttachment)
      .find({
        where: { messageId: In(uniqueMessageIds) },
        order: { createdAt: "ASC" },
      });

    const grouped = new Map<string, MessageAttachment[]>();

    for (const attachment of attachments) {
      const messageAttachments = grouped.get(attachment.messageId) ?? [];
      messageAttachments.push(attachment);
      grouped.set(attachment.messageId, messageAttachments);
    }

    const entries = await Promise.all(
      [...grouped.entries()].map(
        async ([messageId, messageAttachments]) =>
          [
            messageId,
            await this.serializeAttachments(messageAttachments),
          ] as const,
      ),
    );

    return new Map(entries);
  }

  async deleteStorageObjects(storagePaths: string[]): Promise<void> {
    for (const storagePath of storagePaths) {
      try {
        await this.storageService.deleteObject(storagePath);
      } catch (error) {
        this.logger.warn(
          `Could not remove stored media object "${storagePath}".`,
          error instanceof Error ? error.message : undefined,
        );
      }
    }
  }

  private validateMedia(file: ConversationUploadFile): MediaTypeConfig {
    const config = MEDIA_TYPES[file.mimetype];

    if (!config) {
      throw new BadRequestException(
        "Supported files: JPEG, PNG, WebP, MP4, WebM, MP3, M4A, WAV, OGG, and PDF.",
      );
    }

    if (!file.buffer?.length || file.buffer.length > config.maxSizeBytes) {
      const maxSizeMb = Math.floor(config.maxSizeBytes / (1024 * 1024));
      throw new BadRequestException(
        `${file.originalname} must be ${maxSizeMb} MB or smaller.`,
      );
    }

    if (!this.hasValidSignature(file.buffer, file.mimetype)) {
      throw new BadRequestException(
        `The uploaded file "${file.originalname}" does not match its file type.`,
      );
    }

    return config;
  }

  private hasValidSignature(buffer: Buffer, mimeType: string): boolean {
    if (mimeType === "image/jpeg") {
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    }

    if (mimeType === "image/png") {
      return (
        buffer.length >= 8 &&
        buffer
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      );
    }

    if (mimeType === "image/webp") {
      return (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
      );
    }

    if (mimeType === "video/mp4" || mimeType === "audio/mp4") {
      return buffer.length >= 8 && buffer.toString("ascii", 4, 8) === "ftyp";
    }

    if (mimeType === "video/webm" || mimeType === "audio/webm") {
      return (
        buffer.length >= 4 &&
        buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
      );
    }

    if (mimeType === "audio/mpeg") {
      return (
        (buffer.length >= 3 && buffer.toString("ascii", 0, 3) === "ID3") ||
        (buffer.length >= 2 &&
          buffer[0] === 0xff &&
          (buffer[1] & 0xe0) === 0xe0)
      );
    }

    if (mimeType === "audio/wav") {
      return (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WAVE"
      );
    }

    if (mimeType === "audio/ogg") {
      return buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "OggS";
    }

    if (mimeType === "application/pdf") {
      return buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-";
    }

    return false;
  }

  private sanitizeFileName(originalName: string, extension: string): string {
    const sanitizedName = originalName
      .replace(/[\\/\0-\x1f\x7f]/g, "_")
      .trim()
      .slice(0, 255);

    return sanitizedName || `attachment.${extension}`;
  }
}
