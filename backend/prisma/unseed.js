/**
 * Removes all data from the database (reverse of seed).
 * Use when you want to clear seed/demo data and keep the schema.
 * WARNING: This deletes ALL rows in all tables. Do not run on production with real data.
 *
 * Run: node prisma/unseed.js
 * Or:  npm run db:unseed
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing all data (unseed)...');

  // Delete in dependency order (children first)
  await prisma.billItemEmployee.deleteMany({});
  await prisma.packageRedemption.deleteMany({});
  await prisma.billItem.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.customerPackage.deleteMany({});
  await prisma.bill.deleteMany({});
  await prisma.billImportLog.deleteMany({});
  await prisma.stockTransferItem.deleteMany({});
  await prisma.stockTransfer.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.employeePerformance.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.waitingList.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.bankDeposit.deleteMany({});
  await prisma.cashSource.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.userSession.deleteMany({});
  await prisma.packageService.deleteMany({});
  await prisma.packageServiceGroup.deleteMany({});
  await prisma.package.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.chair.deleteMany({});
  await prisma.branchFeature.deleteMany({});
  await prisma.employeeDetail.deleteMany({});
  // Delete all users except the owner (keep owner for login)
  await prisma.user.deleteMany({ where: { username: { not: 'owner' } } });
  await prisma.expenseCategory.deleteMany({});
  await prisma.systemSetting.deleteMany({});
  await prisma.feature.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.inventoryLocation.deleteMany({});
  await prisma.productCategory.deleteMany({});
  await prisma.serviceCategory.deleteMany({});
  await prisma.branch.deleteMany({});

  console.log('All seed data deleted.');
}

main()
  .catch((e) => {
    console.error('Unseed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
