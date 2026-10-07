import { MigrationInterface, QueryRunner } from "typeorm";

export class Notifications1791700000000 implements MigrationInterface {
  name = "Notifications1791700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('friend_request_received', 'friend_request_accepted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "recipient_id" uuid NOT NULL, "actor_id" uuid, "type" "public"."notifications_type_enum" NOT NULL, "data" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "read_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"), CONSTRAINT "FK_notifications_recipient" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE, CONSTRAINT "FK_notifications_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_recipient_created" ON "notifications" ("recipient_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_recipient_unread" ON "notifications" ("recipient_id", "read_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."idx_notifications_recipient_unread"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_notifications_recipient_created"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
  }
}
