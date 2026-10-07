import { MigrationInterface, QueryRunner } from "typeorm";

export class OneReactionPerUserPerMessage1791600000000 implements MigrationInterface {
  name = "OneReactionPerUserPerMessage1791600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "message_reactions"
      WHERE "id" IN (
        SELECT "id"
        FROM (
          SELECT
            "id",
            ROW_NUMBER() OVER (
              PARTITION BY "message_id", "user_id"
              ORDER BY "created_at" DESC, "id" DESC
            ) AS reaction_order
          FROM "message_reactions"
        ) ranked_reactions
        WHERE reaction_order > 1
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "message_reactions" DROP CONSTRAINT "uq_message_reactions_message_user_emoji"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_reactions" ADD CONSTRAINT "uq_message_reactions_message_user" UNIQUE ("message_id", "user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "message_reactions" DROP CONSTRAINT "uq_message_reactions_message_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_reactions" ADD CONSTRAINT "uq_message_reactions_message_user_emoji" UNIQUE ("message_id", "user_id", "emoji")`,
    );
  }
}
