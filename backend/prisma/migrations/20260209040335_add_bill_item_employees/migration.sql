-- CreateTable
CREATE TABLE "bill_item_employees" (
    "id" UUID NOT NULL,
    "bill_item_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_item_employees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bill_item_employees_bill_item_id_idx" ON "bill_item_employees"("bill_item_id");

-- CreateIndex
CREATE INDEX "bill_item_employees_employee_id_idx" ON "bill_item_employees"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "bill_item_employees_bill_item_id_employee_id_key" ON "bill_item_employees"("bill_item_id", "employee_id");

-- AddForeignKey
ALTER TABLE "bill_item_employees" ADD CONSTRAINT "bill_item_employees_bill_item_id_fkey" FOREIGN KEY ("bill_item_id") REFERENCES "bill_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_item_employees" ADD CONSTRAINT "bill_item_employees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
