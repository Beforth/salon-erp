const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting salon seed...');

  // Read JSON files
  const sarathesData = JSON.parse(
    fs.readFileSync('/Users/apple/Downloads/salon_services.json', 'utf-8')
  );
  const ksagarData = JSON.parse(
    fs.readFileSync('/Users/apple/Downloads/ksagar_salon_services.json', 'utf-8')
  );

  // Create password hash
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Delete existing data (in correct order to avoid FK constraints)
  console.log('Cleaning existing data...');
  await prisma.billItem.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.bill.deleteMany({});
  await prisma.packageService.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.serviceCategory.deleteMany({});

  // Create Branch 1: Sarathe's Salon
  const branch1 = await prisma.branch.upsert({
    where: { code: 'SARATHES' },
    update: {
      name: sarathesData.salon_name,
      address: sarathesData.location,
      phone: sarathesData.contact.mobile[0],
      email: sarathesData.contact.email,
      city: 'Nashik',
      state: 'Maharashtra',
      pincode: '422003',
    },
    create: {
      name: sarathesData.salon_name,
      code: 'SARATHES',
      address: sarathesData.location,
      phone: sarathesData.contact.mobile[0],
      email: sarathesData.contact.email,
      city: 'Nashik',
      state: 'Maharashtra',
      pincode: '422003',
    },
  });
  console.log('Created branch:', branch1.name);

  // Create Branch 2: K'sagar Salon
  const branch2 = await prisma.branch.upsert({
    where: { code: 'KSAGAR' },
    update: {
      name: ksagarData.salon_name,
      phone: ksagarData.contact.mobile[0],
    },
    create: {
      name: ksagarData.salon_name,
      code: 'KSAGAR',
      phone: ksagarData.contact.mobile[0],
      city: 'Nashik',
      state: 'Maharashtra',
    },
  });
  console.log('Created branch:', branch2.name);

  // Create/Update owner user
  await prisma.user.upsert({
    where: { username: 'owner' },
    update: {},
    create: {
      username: 'owner',
      email: 'owner@salon.com',
      passwordHash,
      fullName: 'Salon Owner',
      phone: '9800000001',
      role: 'owner',
      branchId: null,
    },
  });

  // Create managers for each branch
  await prisma.user.upsert({
    where: { username: 'manager_sarathes' },
    update: { branchId: branch1.id },
    create: {
      username: 'manager_sarathes',
      email: 'manager@sarathes.com',
      passwordHash,
      fullName: 'Sarathes Manager',
      phone: sarathesData.contact.mobile[0],
      role: 'manager',
      branchId: branch1.id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'manager_ksagar' },
    update: { branchId: branch2.id },
    create: {
      username: 'manager_ksagar',
      email: 'manager@ksagar.com',
      passwordHash,
      fullName: 'Ksagar Manager',
      phone: ksagarData.contact.mobile[0],
      role: 'manager',
      branchId: branch2.id,
    },
  });

  // Create cashiers for each branch
  await prisma.user.upsert({
    where: { username: 'cashier_sarathes' },
    update: { branchId: branch1.id },
    create: {
      username: 'cashier_sarathes',
      email: 'cashier@sarathes.com',
      passwordHash,
      fullName: 'Sarathes Cashier',
      phone: '9800000010',
      role: 'cashier',
      branchId: branch1.id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'cashier_ksagar' },
    update: { branchId: branch2.id },
    create: {
      username: 'cashier_ksagar',
      email: 'cashier@ksagar.com',
      passwordHash,
      fullName: 'Ksagar Cashier',
      phone: '9800000011',
      role: 'cashier',
      branchId: branch2.id,
    },
  });

  console.log('Created users');

  // Function to create categories and services for a branch
  async function createBranchServices(branchId, branchName, serviceCategories) {
    let totalServices = 0;

    for (const category of serviceCategories) {
      // Create category
      const dbCategory = await prisma.serviceCategory.create({
        data: {
          name: category.category_name,
          branchId: branchId,
          displayOrder: category.display_order,
          isActive: true,
        },
      });

      // Create services for this category
      for (const service of category.services) {
        await prisma.service.create({
          data: {
            serviceName: service.service_name,
            categoryId: dbCategory.id,
            branchId: branchId,
            price: service.price,
            durationMinutes: service.duration_minutes || null,
            description: service.description || null,
            starPoints: Math.ceil(service.price / 100), // 1 star per ₹100
            isActive: true,
          },
        });
        totalServices++;
      }
    }

    console.log(`Created ${serviceCategories.length} categories and ${totalServices} services for ${branchName}`);
  }

  // Create services for Branch 1 (Sarathe's)
  await createBranchServices(branch1.id, branch1.name, sarathesData.service_categories);

  // Create services for Branch 2 (K'sagar)
  await createBranchServices(branch2.id, branch2.name, ksagarData.service_categories);

  // Create sample customers
  const customers = [
    { name: 'Raj Kumar', phone: '9876543210', gender: 'male', age: 'young' },
    { name: 'Priya Sharma', phone: '9876543211', gender: 'female', age: 'young' },
    { name: 'Amit Singh', phone: '9876543212', gender: 'male', age: 'teen' },
    { name: 'Meera Patil', phone: '9876543213', gender: 'female', age: 'old' },
    { name: 'Vikram Joshi', phone: '9876543214', gender: 'male', age: 'young' },
  ];

  const owner = await prisma.user.findUnique({ where: { username: 'owner' } });

  for (const customer of customers) {
    const phoneMasked = customer.phone.substring(0, 2) + '****' + customer.phone.substring(6);
    const existing = await prisma.customer.findFirst({
      where: { phone: customer.phone },
    });
    if (!existing) {
      await prisma.customer.create({
        data: {
          customerName: customer.name,
          phone: customer.phone,
          phoneMasked,
          gender: customer.gender,
          ageCategory: customer.age,
          createdById: owner.id,
        },
      });
    }
  }

  console.log('Created sample customers');

  // Create inventory locations for branches
  await prisma.inventoryLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000030' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000030',
      locationName: 'Sarathes Store',
      locationType: 'branch_store',
      branchId: branch1.id,
    },
  });

  await prisma.inventoryLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000031' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000031',
      locationName: 'Ksagar Store',
      locationType: 'branch_store',
      branchId: branch2.id,
    },
  });

  console.log('Created inventory locations');

  console.log('\n========================================');
  console.log('Salon seed completed successfully!');
  console.log('========================================\n');
  console.log('Branches created:');
  console.log(`  1. ${branch1.name} (Code: ${branch1.code})`);
  console.log(`  2. ${branch2.name} (Code: ${branch2.code})`);
  console.log('\nLogin credentials (all use Password123!):');
  console.log('  - owner (access to all branches)');
  console.log('  - manager_sarathes (Sarathes branch)');
  console.log('  - manager_ksagar (Ksagar branch)');
  console.log('  - cashier_sarathes (Sarathes branch)');
  console.log('  - cashier_ksagar (Ksagar branch)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
