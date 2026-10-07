import { MigrationInterface, QueryRunner } from "typeorm";

export class ConversationManagement1791220000000 implements MigrationInterface {
  name = "ConversationManagement1791220000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `ALTER TABLE "conversation_members" ADD "hidden_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation_members" DROP COLUMN "hidden_at"`,
    );

    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN "deleted_at"`,
    );
  }
}
