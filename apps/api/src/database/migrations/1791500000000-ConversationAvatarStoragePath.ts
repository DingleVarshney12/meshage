import { MigrationInterface, QueryRunner } from "typeorm";

export class ConversationAvatarStoragePath1791500000000 implements MigrationInterface {
  name = "ConversationAvatarStoragePath1791500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "avatar_storage_path" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN "avatar_storage_path"`,
    );
  }
}
