/**
 * Migration script: Move services from Male/Female Package categories
 * into proper Package records, then deactivate the original service entries.
 */
const prisma = require('../src/config/database');

async function migratePackages() {
  // Find all package-type categories (Male Packages, Female Packages, Male Package, Female Package)
  const packageCategories = await prisma.serviceCategory.findMany({
    where: {
      name: { in: ['Male Packages', 'Female Packages', 'Male Package', 'Female Package'] },
    },
    select: { id: true, name: true, branchId: true },
  });

  console.log(`Found ${packageCategories.length} package categories:`);
  packageCategories.forEach((c) => console.log(`  - ${c.name} (branch: ${c.branchId})`));

  if (packageCategories.length === 0) {
    console.log('No package categories found. Nothing to migrate.');
    await prisma.$disconnect();
    return;
  }

  const categoryIds = packageCategories.map((c) => c.id);

  // Get all services in these categories
  const packageServices = await prisma.service.findMany({
    where: { categoryId: { in: categoryIds } },
    include: { category: true, branch: true },
    orderBy: { price: 'asc' },
  });

  console.log(`\nFound ${packageServices.length} services to migrate into packages.\n`);

  let created = 0;
  let deactivated = 0;

  await prisma.$transaction(async (tx) => {
    for (const svc of packageServices) {
      // Determine gender tag from category name
      const catName = svc.category.name.toLowerCase();
      const gender = catName.includes('male') && !catName.includes('female') ? 'Male' : 'Female';

      // Create a Package record
      const pkg = await tx.package.create({
        data: {
          packageName: svc.serviceName,
          packagePrice: svc.price,
          description: `${gender} Package`,
          isActive: svc.isActive,
        },
      });

      console.log(`  Created package: "${svc.serviceName}" @ Rs ${svc.price} [${gender}]`);
      created++;

      // Deactivate the original service entry
      await tx.service.update({
        where: { id: svc.id },
        data: { isActive: false },
      });
      deactivated++;
    }
  });

  console.log(`\nMigration complete: ${created} packages created, ${deactivated} services deactivated.`);
  await prisma.$disconnect();
}

migratePackages().catch((err) => {
  console.error('Migration failed:', err);
  prisma.$disconnect();
  process.exit(1);
});
