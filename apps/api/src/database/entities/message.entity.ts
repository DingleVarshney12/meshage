import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";
import { Conversation } from "./conversation.entity";
import { User } from "./user.entity";

export enum MessageType {
  TEXT = "text",
  MEDIA = "media",
  SYSTEM = "system",
}

@Entity({ name: "messages" })
@Index("idx_messages_conversation_created", ["conversationId", "createdAt"])
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Conversation, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation!: Conversation;

  @Column({ name: "conversation_id", type: "uuid" })
  conversationId!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "sender_id" })
  sender?: User | null;

  @Column({ name: "sender_id", type: "uuid", nullable: true })
  senderId?: string | null;

  @Column({
    type: "enum",
    enum: MessageType,
    enumName: "messages_type_enum",
    default: MessageType.TEXT,
  })
  type!: MessageType;

  @Column({ type: "text", nullable: true })
  body?: string | null;

  @ManyToOne(() => Message, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "reply_to_message_id" })
  replyTo?: Message | null;

  @Column({ name: "reply_to_message_id", type: "uuid", nullable: true })
  replyToMessageId?: string | null;

  @Column({ name: "edited_at", type: "timestamptz", nullable: true })
  editedAt?: Date | null;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt?: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
