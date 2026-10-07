import { MigrationInterface, QueryRunner } from "typeorm";

export class WorldChatSingleton1791400000000 implements MigrationInterface {
  name = "WorldChatSingleton1791400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_conversations_single_world"
      ON "conversations" ("type")
      WHERE "type" = 'world'
    `);

    await queryRunner.query(`
      INSERT INTO "conversations" ("type", "title")
      VALUES ('world', 'World chat')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_conversations_single_world"
    `);
  }
}
