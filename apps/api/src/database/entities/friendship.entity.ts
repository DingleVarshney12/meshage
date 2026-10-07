import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  Check,
} from "typeorm";
import { User } from "./user.entity";

@Entity({ name: "friendships" })
@Unique("uq_friendships_user_pair", ["userAId", "userBId"])
@Check("chk_friendships_user_order", '"user_a_id" < "user_b_id"')
export class Friendship {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_a_id" })
  userA!: User;

  @Column({ name: "user_a_id", type: "uuid" })
  userAId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_b_id" })
  userB!: User;

  @Column({ name: "user_b_id", type: "uuid" })
  userBId!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
