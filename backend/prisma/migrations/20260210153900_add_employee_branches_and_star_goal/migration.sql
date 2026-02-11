-- AlterTable
ALTER TABLE "employee_details" ADD COLUMN     "monthly_star_goal" INTEGER;

-- CreateTable
CREATE TABLE "employee_branches" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_branches_user_id_idx" ON "employee_branches"("user_id");

-- CreateIndex
CREATE INDEX "employee_branches_branch_id_idx" ON "employee_branches"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_branches_user_id_branch_id_key" ON "employee_branches"("user_id", "branch_id");

-- AddForeignKey
ALTER TABLE "employee_branches" ADD CONSTRAINT "employee_branches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_branches" ADD CONSTRAINT "employee_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
