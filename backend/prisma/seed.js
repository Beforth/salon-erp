const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create branches
  const branch1 = await prisma.branch.upsert({
    where: { code: 'SB001' },
    update: {},
    create: {
      name: 'Salon Branch 1',
      code: 'SB001',
      address: '123 MG Road, Pimpri',
      phone: '9876543210',
      email: 'branch1@salon.com',
      city: 'Pimpri',
      state: 'Maharashtra',
      pincode: '411017',
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { code: 'SB002' },
    update: {},
    create: {
      name: 'Salon Branch 2',
      code: 'SB002',
      address: '456 Station Road, Chinchwad',
      phone: '9876543211',
      email: 'branch2@salon.com',
      city: 'Chinchwad',
      state: 'Maharashtra',
      pincode: '411019',
    },
  });

  console.log('Created branches:', branch1.code, branch2.code);

  // Create password hash (password: Password123!)
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Create users
  const owner = await prisma.user.upsert({
    where: { username: 'owner' },
    update: {},
    create: {
      username: 'owner',
      email: 'owner@salon.com',
      passwordHash,
      fullName: 'Salon Owner',
      phone: '9800000001',
      role: 'owner',
      branchId: null, // Owner has access to all branches
    },
  });

  const developer = await prisma.user.upsert({
    where: { username: 'developer' },
    update: {},
    create: {
      username: 'developer',
      email: 'developer@salon.com',
      passwordHash,
      fullName: 'System Developer',
      phone: '9800000000',
      role: 'developer',
      branchId: null,
    },
  });

  const manager1 = await prisma.user.upsert({
    where: { username: 'manager1' },
    update: {},
    create: {
      username: 'manager1',
      email: 'manager1@salon.com',
      passwordHash,
      fullName: 'Manager Branch 1',
      phone: '9800000002',
      role: 'manager',
      branchId: branch1.id,
    },
  });

  const manager2 = await prisma.user.upsert({
    where: { username: 'manager2' },
    update: {},
    create: {
      username: 'manager2',
      email: 'manager2@salon.com',
      passwordHash,
      fullName: 'Manager Branch 2',
      phone: '9800000003',
      role: 'manager',
      branchId: branch2.id,
    },
  });

  const cashier1 = await prisma.user.upsert({
    where: { username: 'cashier1' },
    update: {},
    create: {
      username: 'cashier1',
      email: 'cashier1@salon.com',
      passwordHash,
      fullName: 'Cashier Branch 1',
      phone: '9800000004',
      role: 'cashier',
      branchId: branch1.id,
    },
  });

  const employee1 = await prisma.user.upsert({
    where: { username: 'employee1' },
    update: {},
    create: {
      username: 'employee1',
      email: 'employee1@salon.com',
      passwordHash,
      fullName: 'Ramesh Kumar',
      phone: '9800000005',
      role: 'employee',
      branchId: branch1.id,
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { username: 'employee2' },
    update: {},
    create: {
      username: 'employee2',
      email: 'employee2@salon.com',
      passwordHash,
      fullName: 'Suresh Patil',
      phone: '9800000006',
      role: 'employee',
      branchId: branch1.id,
    },
  });

  console.log('Created users');

  // Create employee details
  await prisma.employeeDetail.upsert({
    where: { id: employee1.id },
    update: {},
    create: {
      id: employee1.id,
      employeeCode: 'EMP001',
      joiningDate: new Date('2025-01-01'),
      baseSalary: 20000,
      barcode: 'EMP001-BARCODE',
    },
  });

  await prisma.employeeDetail.upsert({
    where: { id: employee2.id },
    update: {},
    create: {
      id: employee2.id,
      employeeCode: 'EMP002',
      joiningDate: new Date('2025-02-01'),
      baseSalary: 18000,
      barcode: 'EMP002-BARCODE',
    },
  });

  console.log('Created employee details');

  // Create service categories
  const hairCategory = await prisma.serviceCategory.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Hair Services',
      description: 'All hair-related services',
      displayOrder: 1,
    },
  });

  const beardCategory = await prisma.serviceCategory.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Beard & Shaving',
      description: 'Beard grooming and shaving services',
      displayOrder: 2,
    },
  });

  const faceCategory = await prisma.serviceCategory.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Face Care',
      description: 'Facial and skin care services',
      displayOrder: 3,
    },
  });

  console.log('Created service categories');

  // Create services
  const servicesData = [
    { name: 'Haircut - Regular', categoryId: hairCategory.id, price: 150, duration: 20, stars: 5 },
    { name: 'Haircut - Premium', categoryId: hairCategory.id, price: 300, duration: 30, stars: 10 },
    { name: 'Hair Styling', categoryId: hairCategory.id, price: 200, duration: 25, stars: 8 },
    { name: 'Hair Color - Basic', categoryId: hairCategory.id, price: 500, duration: 60, stars: 15 },
    { name: 'Hair Color - Premium', categoryId: hairCategory.id, price: 1000, duration: 90, stars: 25 },
    { name: 'Hair Spa', categoryId: hairCategory.id, price: 800, duration: 60, stars: 20 },
    { name: 'Beard Trim', categoryId: beardCategory.id, price: 80, duration: 15, stars: 3 },
    { name: 'Clean Shave', categoryId: beardCategory.id, price: 100, duration: 20, stars: 4 },
    { name: 'Beard Styling', categoryId: beardCategory.id, price: 150, duration: 20, stars: 5 },
    { name: 'Face Cleanup', categoryId: faceCategory.id, price: 300, duration: 30, stars: 10 },
    { name: 'Facial - Basic', categoryId: faceCategory.id, price: 500, duration: 45, stars: 15 },
    { name: 'Facial - Premium', categoryId: faceCategory.id, price: 1000, duration: 60, stars: 25 },
  ];

  // Delete existing package_services first (they reference services), then services
  await prisma.packageService.deleteMany({});
  await prisma.service.deleteMany({});

  await prisma.service.createMany({
    data: servicesData.map(service => ({
      serviceName: service.name,
      categoryId: service.categoryId,
      price: service.price,
      durationMinutes: service.duration,
      starPoints: service.stars,
    })),
  });

  console.log('Created services');

  // Create product categories
  const hairProductCategory = await prisma.productCategory.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Hair Products',
      description: 'Hair care products',
    },
  });

  const skinProductCategory = await prisma.productCategory.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      name: 'Skin Products',
      description: 'Skin care products',
    },
  });

  console.log('Created product categories');

  // Create products
  const products = [
    { name: 'Hair Oil - 100ml', category: hairProductCategory.id, mrp: 200, selling: 180, cost: 120, type: 'retail', barcode: 'PROD001' },
    { name: 'Shampoo - 250ml', category: hairProductCategory.id, mrp: 350, selling: 320, cost: 200, type: 'retail', barcode: 'PROD002' },
    { name: 'Hair Color - Black', category: hairProductCategory.id, mrp: 450, selling: 400, cost: 250, type: 'consumption', barcode: 'PROD003' },
    { name: 'Hair Color - Brown', category: hairProductCategory.id, mrp: 450, selling: 400, cost: 250, type: 'consumption', barcode: 'PROD004' },
    { name: 'Face Cream - 50g', category: skinProductCategory.id, mrp: 300, selling: 280, cost: 180, type: 'retail', barcode: 'PROD005' },
    { name: 'Face Wash - 100ml', category: skinProductCategory.id, mrp: 250, selling: 230, cost: 150, type: 'retail', barcode: 'PROD006' },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { barcode: product.barcode },
      update: {},
      create: {
        productName: product.name,
        categoryId: product.category,
        barcode: product.barcode,
        sku: product.barcode,
        mrp: product.mrp,
        sellingPrice: product.selling,
        costPrice: product.cost,
        productType: product.type,
        reorderLevel: 10,
      },
    });
  }

  console.log('Created products');

  // Create inventory locations
  const centralStore1 = await prisma.inventoryLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      locationName: 'Central Store 1',
      locationType: 'central_store',
      address: 'Warehouse 1, Industrial Area',
    },
  });

  const branch1Store = await prisma.inventoryLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000021' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000021',
      locationName: 'Branch 1 Store',
      locationType: 'branch_store',
      branchId: branch1.id,
    },
  });

  const branch2Store = await prisma.inventoryLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000022' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000022',
      locationName: 'Branch 2 Store',
      locationType: 'branch_store',
      branchId: branch2.id,
    },
  });

  console.log('Created inventory locations');

  // Create expense categories
  const expenseCategories = [
    'Electricity Bill',
    'Water Bill',
    'Rent',
    'Staff Salary',
    'Maintenance',
    'Marketing',
    'Supplies',
    'Others',
  ];

  for (const name of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('Created expense categories');

  // Create system settings
  const settings = [
    { key: 'tax_rate', value: '0', type: 'number', description: 'Default tax rate percentage' },
    { key: 'bill_prefix', value: 'BILL', type: 'string', description: 'Bill number prefix' },
    { key: 'low_stock_threshold', value: '10', type: 'number', description: 'Minimum quantity before low stock alert' },
    { key: 'working_hours_per_day', value: '8', type: 'number', description: 'Standard working hours per day' },
    { key: 'star_points_to_currency', value: '10', type: 'number', description: 'Conversion rate: 1 rupee = X stars' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { settingKey: setting.key },
      update: {},
      create: {
        settingKey: setting.key,
        settingValue: setting.value,
        settingType: setting.type,
        description: setting.description,
      },
    });
  }

  console.log('Created system settings');

  // Create features
  const features = [
    { name: 'Bill Import', key: 'bill_import' },
    { name: 'Advanced Reports', key: 'advanced_reports' },
    { name: 'Employee Performance', key: 'employee_performance' },
    { name: 'Inventory Management', key: 'inventory_management' },
    { name: 'Package Management', key: 'package_management' },
  ];

  for (const feature of features) {
    await prisma.feature.upsert({
      where: { featureKey: feature.key },
      update: {},
      create: {
        featureName: feature.name,
        featureKey: feature.key,
      },
    });
  }

  console.log('Created features');

  // Create chairs for branches
  for (let i = 1; i <= 5; i++) {
    await prisma.chair.upsert({
      where: {
        branchId_chairNumber: {
          branchId: branch1.id,
          chairNumber: `C${i.toString().padStart(2, '0')}`,
        },
      },
      update: {},
      create: {
        chairNumber: `C${i.toString().padStart(2, '0')}`,
        chairName: `Chair ${i}`,
        branchId: branch1.id,
      },
    });
  }

  for (let i = 1; i <= 4; i++) {
    await prisma.chair.upsert({
      where: {
        branchId_chairNumber: {
          branchId: branch2.id,
          chairNumber: `C${i.toString().padStart(2, '0')}`,
        },
      },
      update: {},
      create: {
        chairNumber: `C${i.toString().padStart(2, '0')}`,
        chairName: `Chair ${i}`,
        branchId: branch2.id,
      },
    });
  }

  console.log('Created chairs');

  // Create sample customers
  const customers = [
    { name: 'Raj Kumar', phone: '9876543210', gender: 'male', age: 'young' },
    { name: 'Priya Sharma', phone: '9876543211', gender: 'female', age: 'young' },
    { name: 'Amit Singh', phone: '9876543212', gender: 'male', age: 'teen' },
    { name: 'Meera Patil', phone: '9876543213', gender: 'female', age: 'old' },
    { name: 'Vikram Joshi', phone: '9876543214', gender: 'male', age: 'young' },
  ];

  for (const customer of customers) {
    const phoneMasked = customer.phone.substring(0, 2) + '****' + customer.phone.substring(6);
    await prisma.customer.upsert({
      where: { id: `00000000-0000-0000-0000-00000000010${customers.indexOf(customer)}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0000-00000000010${customers.indexOf(customer)}`,
        customerName: customer.name,
        phone: customer.phone,
        phoneMasked,
        gender: customer.gender,
        ageCategory: customer.age,
        createdById: owner.id,
      },
    });
  }

  console.log('Created sample customers');

  console.log('Database seed completed successfully!');
  console.log('\nDefault login credentials:');
  console.log('Username: owner, Password: Password123!');
  console.log('Username: manager1, Password: Password123!');
  console.log('Username: cashier1, Password: Password123!');
  console.log('Username: employee1, Password: Password123!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
