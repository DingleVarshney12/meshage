import {
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "push_subscriptions" })
@Index("uq_push_subscriptions_endpoint", ["endpoint"], { unique: true })
@Index("idx_push_subscriptions_user", ["userId"])
export class PushSubscription {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ type: "text" })
  endpoint!: string;

  @Column({ name: "p256dh_key", type: "text" })
  p256dh!: string;

  @Column({ name: "auth_key", type: "text" })
  auth!: string;

  @Column({ name: "user_agent", type: "text", nullable: true })
  userAgent?: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
