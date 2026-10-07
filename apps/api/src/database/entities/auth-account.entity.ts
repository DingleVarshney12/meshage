import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
  Unique,
} from "typeorm";
import { User } from "./user.entity";

export enum AuthProvider {
  EMAIL = "email",
  GOOGLE = "google",
}

@Entity({ name: "auth_accounts" })
@Unique("uq_auth_accounts_provider_user", ["provider", "providerUserId"])
export class AuthAccount {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({
    type: "enum",
    enum: AuthProvider,
    enumName: "auth_accounts_provider_enum",
  })
  provider!: AuthProvider;

  @Column({ name: "provider_user_id", type: "varchar", length: 255 })
  providerUserId!: string;

  @Column({
    name: "password_hash",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  passwordHash?: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
