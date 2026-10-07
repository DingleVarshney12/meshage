import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from "typeorm";

export enum ProfileVisibility {
  PUBLIC = "public",
  PRIVATE = "private",
}

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 320, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 30, unique: true })
  username!: string;

  @Column({ name: "display_name", type: "varchar", length: 80 })
  displayName!: string;

  @Column({ type: "text", nullable: true })
  bio?: string | null;

  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl?: string | null;

  @Column({ name: "avatar_storage_path", type: "text", nullable: true })
  avatarStoragePath?: string | null;

  @Column({
    name: "profile_visibility",
    type: "enum",
    enum: ProfileVisibility,
    enumName: "users_profile_visibility_enum",
    default: ProfileVisibility.PUBLIC,
  })
  profileVisibility!: ProfileVisibility;

  @Column({
    name: "email_verified_at",
    type: "timestamptz",
    nullable: true,
  })
  emailVerifiedAt?: Date | null;

  @Column({ name: "last_seen_at", type: "timestamptz", nullable: true })
  lastSeenAt?: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
