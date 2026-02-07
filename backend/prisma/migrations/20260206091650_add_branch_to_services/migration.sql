-- AlterTable
ALTER TABLE "service_categories" ADD COLUMN     "branch_id" UUID;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "branch_id" UUID,
ALTER COLUMN "service_name" SET DATA TYPE VARCHAR(200);

-- CreateIndex
CREATE INDEX "service_categories_branch_id_idx" ON "service_categories"("branch_id");

-- CreateIndex
CREATE INDEX "services_branch_id_idx" ON "services"("branch_id");

-- AddForeignKey
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
