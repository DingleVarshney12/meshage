import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from "typeorm";
import { User } from "./user.entity";

export enum ConversationType {
  DIRECT = "direct",
  GROUP = "group",
  WORLD = "world",
}

@Entity({ name: "conversations" })
export class Conversation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "enum",
    enum: ConversationType,
    enumName: "conversations_type_enum",
  })
  type!: ConversationType;

  @Column({ type: "varchar", length: 100, nullable: true })
  title?: string | null;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl?: string | null;
  @Column({ name: "avatar_storage_path", type: "text", nullable: true })
  avatarStoragePath?: string | null;
  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt?: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by_id" })
  createdBy?: User | null;

  @Column({ name: "created_by_id", type: "uuid", nullable: true })
  createdById?: string | null;

  @Column({
    name: "direct_key",
    type: "varchar",
    length: 73,
    nullable: true,
    unique: true,
  })
  directKey?: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
