import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductFields1714442998028 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product" ADD COLUMN "card_number" character varying NULL`);
    await queryRunner.query(`ALTER TABLE "product" ADD COLUMN "player" character varying NULL`);
    await queryRunner.query(`ALTER TABLE "product" ADD COLUMN "team" character varying NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "card_number" `);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "player" `);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "team" `);
  }


}
