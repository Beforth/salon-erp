/*
  Warnings:

  - A unique constraint covering the columns `[customer_code]` on the table `customers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "customer_code" VARCHAR(10);

-- AlterTable
ALTER TABLE "package_categories" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_code_key" ON "customers"("customer_code");
