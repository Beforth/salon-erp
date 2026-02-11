-- DropForeignKey
ALTER TABLE "service_categories" DROP CONSTRAINT IF EXISTS "service_categories_branch_id_fkey";
ALTER TABLE "services" DROP CONSTRAINT IF EXISTS "services_branch_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "service_categories_branch_id_idx";
DROP INDEX IF EXISTS "services_branch_id_idx";

-- AlterTable
ALTER TABLE "service_categories" DROP COLUMN IF EXISTS "branch_id";
ALTER TABLE "services" DROP COLUMN IF EXISTS "branch_id";
