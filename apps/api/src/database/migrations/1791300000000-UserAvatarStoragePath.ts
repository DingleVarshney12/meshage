import { MigrationInterface, QueryRunner } from "typeorm";

export class UserAvatarStoragePath1791300000000 implements MigrationInterface {
  name = "UserAvatarStoragePath1791300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "avatar_storage_path" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "avatar_storage_path"`,
    );
  }
}
