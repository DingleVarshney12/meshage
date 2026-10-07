import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

export enum NotificationType {
  FRIEND_REQUEST_RECEIVED = "friend_request_received",
  FRIEND_REQUEST_ACCEPTED = "friend_request_accepted",
  FRIEND_REQUEST_REJECTED = "friend_request_rejected",
}

@Entity({ name: "notifications" })
@Index("idx_notifications_recipient_created", ["recipientId", "createdAt"])
@Index("idx_notifications_recipient_unread", ["recipientId", "readAt"])
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "recipient_id", type: "uuid" })
  recipientId!: string;

  @Column({ name: "actor_id", type: "uuid", nullable: true })
  actorId?: string | null;

  @Column({
    type: "enum",
    enum: NotificationType,
    enumName: "notifications_type_enum",
  })
  type!: NotificationType;

  @Column({ type: "jsonb", nullable: true })
  data?: Record<string, string> | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "read_at", type: "timestamptz", nullable: true })
  readAt?: Date | null;
}
