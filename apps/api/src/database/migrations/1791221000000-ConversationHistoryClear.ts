import { MigrationInterface, QueryRunner } from "typeorm";

export class ConversationHistoryClear1791221000000 implements MigrationInterface {
  name = "ConversationHistoryClear1791221000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation_members" ADD "history_cleared_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation_members" DROP COLUMN "history_cleared_at"`,
    );
  }
}
