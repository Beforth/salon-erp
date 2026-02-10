-- CreateTable
CREATE TABLE "package_service_groups" (
    "id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "group_label" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "package_service_groups_pkey" PRIMARY KEY ("id")
);

-- Drop unique index on package_services (package_id, service_id) so same service can appear in standalone + group
DROP INDEX IF EXISTS "package_services_package_id_service_id_key";

-- Add group_id to package_services
ALTER TABLE "package_services" ADD COLUMN "group_id" UUID;

-- CreateIndex
CREATE INDEX "package_service_groups_package_id_idx" ON "package_service_groups"("package_id");

-- CreateIndex
CREATE INDEX "package_services_group_id_idx" ON "package_services"("group_id");

-- Unique: at most one standalone (same service without group) per package
CREATE UNIQUE INDEX "package_services_package_id_service_id_group_id_key" ON "package_services"("package_id", "service_id") WHERE "group_id" IS NULL;
-- Unique: same service can appear once per group
CREATE UNIQUE INDEX "package_services_package_id_service_id_group_id_key2" ON "package_services"("package_id", "service_id", "group_id") WHERE "group_id" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "package_service_groups" ADD CONSTRAINT "package_service_groups_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "package_services" ADD CONSTRAINT "package_services_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "package_service_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
