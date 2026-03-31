/*
  Warnings:

  - The values [SQL_AUTH] on the enum `SqlAuthType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SqlAuthType_new" AS ENUM ('SQL_AUTHS', 'WINDOWS_AUTH');
ALTER TABLE "public"."Setting" ALTER COLUMN "sqlAuthType" DROP DEFAULT;
ALTER TABLE "Setting" ALTER COLUMN "sqlAuthType" TYPE "SqlAuthType_new" USING ("sqlAuthType"::text::"SqlAuthType_new");
ALTER TYPE "SqlAuthType" RENAME TO "SqlAuthType_old";
ALTER TYPE "SqlAuthType_new" RENAME TO "SqlAuthType";
DROP TYPE "public"."SqlAuthType_old";
ALTER TABLE "Setting" ALTER COLUMN "sqlAuthType" SET DEFAULT 'SQL_AUTHS';
COMMIT;

-- AlterTable
ALTER TABLE "Setting" ALTER COLUMN "sqlAuthType" SET DEFAULT 'SQL_AUTHS';
