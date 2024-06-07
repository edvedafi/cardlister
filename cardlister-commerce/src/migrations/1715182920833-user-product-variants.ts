import { MigrationInterface, QueryRunner } from 'typeorm';

export class VariantProductVariants1715182920833 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_variant" ADD "store_id" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "VariantStoreId" ON "product_variant" ("store_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."VariantStoreId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variant" DROP COLUMN "store_id"`,
    );
  }

}
