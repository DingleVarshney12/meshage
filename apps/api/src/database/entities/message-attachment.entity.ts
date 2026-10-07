import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";
import { Message } from "./message.entity";

export enum AttachmentType {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  FILE = "file",
}

@Entity({ name: "message_attachments" })
export class MessageAttachment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Message, { onDelete: "CASCADE" })
  @JoinColumn({ name: "message_id" })
  message!: Message;

  @Column({ name: "message_id", type: "uuid" })
  messageId!: string;

  @Column({
    type: "enum",
    enum: AttachmentType,
    enumName: "message_attachments_type_enum",
  })
  type!: AttachmentType;

  @Column({ name: "storage_path", type: "text", unique: true })
  storagePath!: string;

  @Column({ name: "original_name", type: "varchar", length: 255 })
  originalName!: string;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType!: string;

  @Column({ name: "size_bytes", type: "integer" })
  sizeBytes!: number;

  @Column({ type: "jsonb", nullable: true })
  waveform?: number[] | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
