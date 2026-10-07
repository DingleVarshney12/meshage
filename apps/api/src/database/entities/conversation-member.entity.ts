import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from "typeorm";
import { Conversation } from "./conversation.entity";
import { User } from "./user.entity";

export enum ConversationMemberRole {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
}

@Entity({ name: "conversation_members" })
@Index("uq_conversation_members_active", ["conversationId", "userId"], {
  unique: true,
  where: '"left_at" IS NULL',
})
export class ConversationMember {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Conversation, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation!: Conversation;

  @Column({ name: "conversation_id", type: "uuid" })
  conversationId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({
    type: "enum",
    enum: ConversationMemberRole,
    enumName: "conversation_members_role_enum",
    default: ConversationMemberRole.MEMBER,
  })
  role!: ConversationMemberRole;

  @CreateDateColumn({ name: "joined_at", type: "timestamptz" })
  joinedAt!: Date;

  @Column({ name: "left_at", type: "timestamptz", nullable: true })
  leftAt?: Date | null;

  @Column({ name: "hidden_at", type: "timestamptz", nullable: true })
  hiddenAt?: Date | null;
  @Column({
    name: "history_cleared_at",
    type: "timestamptz",
    nullable: true,
  })
  historyClearedAt?: Date | null;
  @Column({ name: "last_read_at", type: "timestamptz", nullable: true })
  lastReadAt?: Date | null;
}
