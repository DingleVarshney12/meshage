import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  Index,
} from "typeorm";
import { User } from "./user.entity";

export enum FriendRequestStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

@Entity({ name: "friend_requests" })
@Index("uq_friend_requests_pending_pair", ["senderId", "receiverId"], {
  unique: true,
  where: "\"status\" = 'pending'",
})
export class FriendRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sender_id" })
  sender!: User;

  @Column({ name: "sender_id", type: "uuid" })
  senderId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "receiver_id" })
  receiver!: User;

  @Column({ name: "receiver_id", type: "uuid" })
  receiverId!: string;

  @Column({
    type: "enum",
    enum: FriendRequestStatus,
    enumName: "friend_requests_status_enum",
    default: FriendRequestStatus.PENDING,
  })
  status!: FriendRequestStatus;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @Column({ name: "responded_at", type: "timestamptz", nullable: true })
  respondedAt?: Date | null;
}
