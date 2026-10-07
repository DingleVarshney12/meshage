import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
  Unique,
} from "typeorm";
import { Message } from "./message.entity";
import { User } from "./user.entity";

@Entity({ name: "message_reactions" })
@Unique("uq_message_reactions_message_user", ["messageId", "userId"])
export class MessageReaction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Message, { onDelete: "CASCADE" })
  @JoinColumn({ name: "message_id" })
  message!: Message;

  @Column({ name: "message_id", type: "uuid" })
  messageId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", length: 32 })
  emoji!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
