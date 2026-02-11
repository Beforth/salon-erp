-- CreateTable
CREATE TABLE "package_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_categories_pkey" PRIMARY KEY ("id")
);

-- AddColumn
ALTER TABLE "packages" ADD COLUMN "category_id" UUID;

-- CreateIndex
CREATE INDEX "package_categories_is_active_idx" ON "package_categories"("is_active");

-- CreateIndex
CREATE INDEX "packages_category_id_idx" ON "packages"("category_id");

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "package_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
