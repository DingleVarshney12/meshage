import { MigrationInterface, QueryRunner } from "typeorm";

export class MessageAttachmentWaveform1791800000000 implements MigrationInterface {
  name = "MessageAttachmentWaveform1791800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "message_attachments" ADD COLUMN "waveform" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "message_attachments" DROP COLUMN "waveform"`,
    );
  }
}
