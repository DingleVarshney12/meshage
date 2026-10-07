import { MigrationInterface, QueryRunner } from "typeorm";

export class WebPushNotifications1791800000000 implements MigrationInterface {
  name = "WebPushNotifications1791800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'friend_request_rejected'`,
    );
    await queryRunner.query(
      `CREATE TABLE "push_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "endpoint" text NOT NULL, "p256dh_key" text NOT NULL, "auth_key" text NOT NULL, "user_agent" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_push_subscriptions_id" PRIMARY KEY ("id"), CONSTRAINT "FK_push_subscriptions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_push_subscriptions_endpoint" ON "push_subscriptions" ("endpoint")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_push_subscriptions_user" ON "push_subscriptions" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."idx_push_subscriptions_user"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."uq_push_subscriptions_endpoint"`,
    );
    await queryRunner.query(`DROP TABLE "push_subscriptions"`);
    // PostgreSQL does not support removing a single enum value safely.
  }
}
