const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...\n');

  // ============================================
  // 1. BRANCHES
  // ============================================
  const branch1 = await prisma.branch.upsert({
    where: { code: 'SARATHES' },
    update: {},
    create: {
      name: "Sarathe's Salon",
      code: 'SARATHES',
      address: 'Near Mahatma Nagar, Nashik',
      phone: '9876543210',
      email: 'sarathes@salon.com',
      city: 'Nashik',
      state: 'Maharashtra',
      pincode: '422003',
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { code: 'KSAGAR' },
    update: {},
    create: {
      name: "K'sagar Salon",
      code: 'KSAGAR',
      address: 'College Road, Nashik',
      phone: '9876543211',
      email: 'ksagar@salon.com',
      city: 'Nashik',
      state: 'Maharashtra',
      pincode: '422005',
    },
  });

  console.log('Created branches:', branch1.name, ',', branch2.name);

  // ============================================
  // 2. USERS
  // ============================================
  const passwordHash = await bcrypt.hash('Password123!', 10);

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
      branchId: null,
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
      fullName: 'Manager Sarathes',
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
      fullName: 'Manager Ksagar',
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
      fullName: 'Cashier Sarathes',
      phone: '9800000004',
      role: 'cashier',
      branchId: branch1.id,
    },
  });

  const cashier2 = await prisma.user.upsert({
    where: { username: 'cashier2' },
    update: {},
    create: {
      username: 'cashier2',
      email: 'cashier2@salon.com',
      passwordHash,
      fullName: 'Cashier Ksagar',
      phone: '9800000009',
      role: 'cashier',
      branchId: branch2.id,
    },
  });

  // Employees
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

  const employee3 = await prisma.user.upsert({
    where: { username: 'employee3' },
    update: {},
    create: {
      username: 'employee3',
      email: 'employee3@salon.com',
      passwordHash,
      fullName: 'Vikram Jadhav',
      phone: '9800000007',
      role: 'employee',
      branchId: branch2.id,
    },
  });

  const employee4 = await prisma.user.upsert({
    where: { username: 'employee4' },
    update: {},
    create: {
      username: 'employee4',
      email: 'employee4@salon.com',
      passwordHash,
      fullName: 'Amit Deshmukh',
      phone: '9800000008',
      role: 'employee',
      branchId: branch2.id,
    },
  });

  console.log('Created users');

  // ============================================
  // 3. EMPLOYEE DETAILS
  // ============================================
  const employees = [
    { user: employee1, code: 'EMP001', salary: 20000, joining: '2025-01-01' },
    { user: employee2, code: 'EMP002', salary: 18000, joining: '2025-02-01' },
    { user: employee3, code: 'EMP003', salary: 19000, joining: '2025-01-15' },
    { user: employee4, code: 'EMP004', salary: 17000, joining: '2025-03-01' },
  ];

  for (const emp of employees) {
    await prisma.employeeDetail.upsert({
      where: { id: emp.user.id },
      update: {},
      create: {
        id: emp.user.id,
        employeeCode: emp.code,
        joiningDate: new Date(emp.joining),
        baseSalary: emp.salary,
        barcode: `${emp.code}-BARCODE`,
      },
    });
  }

  console.log('Created employee details');

  // ============================================
  // 4. EMPLOYEE BRANCH MAPPING (multi-branch)
  // ============================================
  const branchMappings = [
    // Branch 1 employees
    { userId: employee1.id, branchId: branch1.id, isPrimary: true },
    { userId: employee2.id, branchId: branch1.id, isPrimary: true },
    // Branch 2 employees
    { userId: employee3.id, branchId: branch2.id, isPrimary: true },
    { userId: employee4.id, branchId: branch2.id, isPrimary: true },
    // Cross-branch: employee1 also works at branch2
    { userId: employee1.id, branchId: branch2.id, isPrimary: false },
    // Managers mapped to their branches
    { userId: manager1.id, branchId: branch1.id, isPrimary: true },
    { userId: manager2.id, branchId: branch2.id, isPrimary: true },
    // Cashiers mapped to their branches
    { userId: cashier1.id, branchId: branch1.id, isPrimary: true },
    { userId: cashier2.id, branchId: branch2.id, isPrimary: true },
  ];

  for (const mapping of branchMappings) {
    await prisma.employeeBranch.upsert({
      where: {
        userId_branchId: { userId: mapping.userId, branchId: mapping.branchId },
      },
      update: {},
      create: mapping,
    });
  }

  console.log('Created employee branch mappings');

  // ============================================
  // 5. SERVICE CATEGORIES (global — no branchId)
  // ============================================
  const serviceCategories = [
    { name: 'Men Hair Cut', order: 1 },
    { name: 'Ladies Hair Cut', order: 2 },
    { name: 'Kids Boy Hair Cut', order: 3 },
    { name: 'Kids Girl Hair Cut', order: 4 },
    { name: 'Shaving', order: 5 },
    { name: 'Hair Care', order: 6 },
    { name: 'Hair Style', order: 7 },
    { name: 'Hair Colour', order: 8 },
    { name: 'Colour', order: 9 },
    { name: 'Facial & Mask', order: 10 },
    { name: 'Bleach', order: 11 },
    { name: 'Waxing', order: 12 },
    { name: 'Manicure & Pedicure', order: 13 },
    { name: 'Hair Treatment', order: 14 },
  ];

  // Clear existing categories (services already deleted above)
  await prisma.serviceCategory.deleteMany({});

  const catMap = {};
  for (const cat of serviceCategories) {
    const created = await prisma.serviceCategory.create({
      data: {
        name: cat.name,
        displayOrder: cat.order,
      },
    });
    catMap[cat.name] = created.id;
  }

  console.log('Created', serviceCategories.length, 'service categories');

  // ============================================
  // 6. SERVICES (global — no branchId)
  // ============================================
  const servicesData = [
    // Men Hair Cut
    { name: 'Hair Cut', cat: 'Men Hair Cut', price: 119, duration: 20, stars: 2 },
    { name: 'Regular Hair Cut', cat: 'Men Hair Cut', price: 99, duration: 15, stars: 1 },
    { name: 'Hair Cut With Shampoo', cat: 'Men Hair Cut', price: 169, duration: 25, stars: 2 },
    { name: 'Hair Styling', cat: 'Men Hair Cut', price: 59, duration: 10, stars: 1 },

    // Ladies Hair Cut
    { name: 'Long Hair Cut', cat: 'Ladies Hair Cut', price: 249, duration: 30, stars: 3 },
    { name: 'Advance Hair Cut With Shampoo Conditioner, Blow-dry', cat: 'Ladies Hair Cut', price: 699, duration: 45, stars: 7 },

    // Kids
    { name: 'Hair Cut', cat: 'Kids Boy Hair Cut', price: 119, duration: 15, stars: 2 },
    { name: 'Hair Cut Under 12 Year', cat: 'Kids Boy Hair Cut', price: 119, duration: 15, stars: 2 },
    { name: 'Hair Cut Under 3 Year', cat: 'Kids Boy Hair Cut', price: 109, duration: 10, stars: 2 },

    // Shaving
    { name: 'Shaving', cat: 'Shaving', price: 49, duration: 15, stars: 1 },
    { name: 'Hair Cut + Shaving', cat: 'Shaving', price: 159, duration: 30, stars: 2 },
    { name: 'Beard Trim', cat: 'Shaving', price: 49, duration: 10, stars: 1 },
    { name: 'Beard', cat: 'Shaving', price: 79, duration: 15, stars: 1 },

    // Hair Care
    { name: 'Regular Hair Spa', cat: 'Hair Care', price: 499, duration: 30, stars: 5 },
    { name: 'Keratin Hair Spa', cat: 'Hair Care', price: 899, duration: 45, stars: 9 },
    { name: 'Loreal Hair Spa', cat: 'Hair Care', price: 1099, duration: 45, stars: 11 },
    { name: 'Hair Wash With Shampoo Conditioner', cat: 'Hair Care', price: 99, duration: 15, stars: 1 },
    { name: 'Head Massage 20 min', cat: 'Hair Care', price: 149, duration: 20, stars: 2 },
    { name: 'Head Massage With Oil 25min', cat: 'Hair Care', price: 199, duration: 25, stars: 2 },
    { name: 'Head Massage Oil With Steam 35min', cat: 'Hair Care', price: 299, duration: 35, stars: 3 },

    // Hair Style
    { name: 'Blow-Dry With Shampoo Conditioner', cat: 'Hair Style', price: 199, duration: 20, stars: 2 },
    { name: 'Ironing', cat: 'Hair Style', price: 299, duration: 30, stars: 3 },
    { name: 'Tong', cat: 'Hair Style', price: 299, duration: 30, stars: 3 },

    // Hair Colour
    { name: 'Root Touchup', cat: 'Hair Colour', price: 399, duration: 45, stars: 4 },
    { name: 'Full Hair Color', cat: 'Hair Colour', price: 999, duration: 60, stars: 10 },
    { name: 'Global', cat: 'Hair Colour', price: 2999, duration: 120, stars: 30 },
    { name: 'Hi-lighting', cat: 'Hair Colour', price: 299, duration: 45, stars: 3 },

    // Colour (Bleach types)
    { name: 'Oxy Bleach', cat: 'Colour', price: 99, duration: 15, stars: 1 },
    { name: 'Gold Bleach', cat: 'Colour', price: 149, duration: 15, stars: 2 },
    { name: 'O3+ Bleach', cat: 'Colour', price: 199, duration: 15, stars: 2 },

    // Facial & Mask
    { name: 'Gold/Diamond/Fruit Facial', cat: 'Facial & Mask', price: 399, duration: 30, stars: 4 },
    { name: 'Ayurveda Facial', cat: 'Facial & Mask', price: 599, duration: 45, stars: 6 },
    { name: 'Richfeel/D-tan Facial', cat: 'Facial & Mask', price: 799, duration: 45, stars: 8 },
    { name: 'Oxy/Vlcc/Lotus Facial', cat: 'Facial & Mask', price: 999, duration: 60, stars: 10 },
    { name: "Cheryl's/N3+/Nandini/Raga Facial", cat: 'Facial & Mask', price: 1499, duration: 60, stars: 15 },
    { name: 'O3+ Whiting Facial', cat: 'Facial & Mask', price: 1999, duration: 75, stars: 20 },
    { name: 'D-Tan Pack + Scrub Regular', cat: 'Facial & Mask', price: 249, duration: 15, stars: 3 },
    { name: 'D-Tan Pack + Scrub Oxy/Specifix/Sara', cat: 'Facial & Mask', price: 349, duration: 15, stars: 4 },
    { name: 'O3+ Mask', cat: 'Facial & Mask', price: 499, duration: 20, stars: 5 },
    { name: 'Thermoherb Mask Tightening', cat: 'Facial & Mask', price: 199, duration: 15, stars: 2 },
    { name: 'Charcoal Mask', cat: 'Facial & Mask', price: 99, duration: 15, stars: 1 },

    // Bleach
    { name: 'Face Bleach - Regular', cat: 'Bleach', price: 99, duration: 15, stars: 1 },
    { name: 'Face Bleach - Oxy', cat: 'Bleach', price: 149, duration: 15, stars: 2 },
    { name: 'Face Bleach - O3+', cat: 'Bleach', price: 249, duration: 15, stars: 3 },
    { name: 'Hand Bleach', cat: 'Bleach', price: 199, duration: 15, stars: 2 },
    { name: 'Full Leg Bleach', cat: 'Bleach', price: 399, duration: 25, stars: 4 },

    // Waxing
    { name: 'Eyebrow', cat: 'Waxing', price: 39, duration: 5, stars: 1 },
    { name: 'Upper Lips/Chin/Fourhead', cat: 'Waxing', price: 29, duration: 5, stars: 1 },
    { name: 'Underarms', cat: 'Waxing', price: 49, duration: 10, stars: 1 },
    { name: 'Hand Wax With Underarms - Regular', cat: 'Waxing', price: 199, duration: 20, stars: 2 },
    { name: 'Hand Wax With Underarms - Rica', cat: 'Waxing', price: 349, duration: 20, stars: 4 },
    { name: 'Full Leg Wax - Regular', cat: 'Waxing', price: 299, duration: 30, stars: 3 },
    { name: 'Full Leg Wax - Rica', cat: 'Waxing', price: 499, duration: 30, stars: 5 },
    { name: 'Half Leg Wax - Regular', cat: 'Waxing', price: 199, duration: 20, stars: 2 },
    { name: 'Half Leg Wax - Rica', cat: 'Waxing', price: 349, duration: 20, stars: 4 },
    { name: 'Full Body Polishing', cat: 'Waxing', price: 2999, duration: 90, stars: 30 },

    // Manicure & Pedicure
    { name: 'Manicure - Regular', cat: 'Manicure & Pedicure', price: 249, duration: 25, stars: 3 },
    { name: 'Manicure - Advance', cat: 'Manicure & Pedicure', price: 499, duration: 35, stars: 5 },
    { name: 'Pedicure - Regular', cat: 'Manicure & Pedicure', price: 299, duration: 30, stars: 3 },
    { name: 'Pedicure - Advance', cat: 'Manicure & Pedicure', price: 599, duration: 40, stars: 6 },

    // Hair Treatment
    { name: 'Smoothing Loreal', cat: 'Hair Treatment', price: 3999, duration: 180, stars: 40 },
    { name: 'Keratin Brazilion', cat: 'Hair Treatment', price: 4999, duration: 180, stars: 50 },
    { name: 'Botox', cat: 'Hair Treatment', price: 3999, duration: 150, stars: 40 },
    { name: 'Nanoplastia', cat: 'Hair Treatment', price: 4999, duration: 180, stars: 50 },
    { name: 'Vegan', cat: 'Hair Treatment', price: 3999, duration: 150, stars: 40 },
  ];

  // Clear existing data that references services/packages (for re-seed support)
  await prisma.packageRedemption.deleteMany({});
  await prisma.customerPackage.deleteMany({});
  await prisma.packageService.deleteMany({});
  await prisma.packageServiceGroup.deleteMany({});
  await prisma.package.deleteMany({});
  await prisma.packageCategory.deleteMany({});
  await prisma.service.deleteMany({});

  const svcMap = {};
  for (const svc of servicesData) {
    const created = await prisma.service.create({
      data: {
        serviceName: svc.name,
        categoryId: catMap[svc.cat],
        price: svc.price,
        durationMinutes: svc.duration,
        starPoints: svc.stars,
      },
    });
    // Store by name+cat for package linking
    svcMap[`${svc.name}|${svc.cat}`] = created.id;
    // Also store by name only (first wins)
    if (!svcMap[svc.name]) svcMap[svc.name] = created.id;
  }

  console.log('Created', servicesData.length, 'services');

  // ============================================
  // 7. PACKAGE CATEGORIES
  // ============================================
  const malePkgCat = await prisma.packageCategory.create({
    data: { name: 'Male Packages', displayOrder: 1 },
  });
  const femalePkgCat = await prisma.packageCategory.create({
    data: { name: 'Female Packages', displayOrder: 2 },
  });
  const hairTreatmentPkgCat = await prisma.packageCategory.create({
    data: { name: 'Hair Treatment Packages', displayOrder: 3 },
  });

  console.log('Created package categories');

  // ============================================
  // 8. PACKAGES with linked services
  // ============================================
  const packagesData = [
    // Male Packages
    {
      name: 'Regular Hair Spa + Hair Cut',
      categoryId: malePkgCat.id,
      price: 649,
      validity: 365,
      services: [
        { name: 'Regular Hair Spa' },
        { name: 'Hair Cut' },
      ],
    },
    {
      name: 'Keratin Hair Spa + Hair Cut',
      categoryId: malePkgCat.id,
      price: 749,
      validity: 365,
      services: [
        { name: 'Keratin Hair Spa' },
        { name: 'Hair Cut' },
      ],
    },
    {
      name: 'Loreal Hair Spa + Hair Cut',
      categoryId: malePkgCat.id,
      price: 1099,
      validity: 365,
      services: [
        { name: 'Loreal Hair Spa' },
        { name: 'Hair Cut' },
      ],
    },
    {
      name: 'Hair Cut + Shaving + Hair Wash + Ayurveda Facial',
      categoryId: malePkgCat.id,
      price: 649,
      validity: 365,
      services: [
        { name: 'Hair Cut' },
        { name: 'Shaving' },
        { name: 'Hair Wash With Shampoo Conditioner' },
        { name: 'Ayurveda Facial' },
      ],
    },
    {
      name: 'Hair Cut + Shaving + D-Tan Scrub + Head Massage',
      categoryId: malePkgCat.id,
      price: 499,
      validity: 365,
      services: [
        { name: 'Hair Cut' },
        { name: 'Shaving' },
        { name: 'D-Tan Pack + Scrub Regular' },
        { name: 'Head Massage 20 min' },
      ],
    },

    // Female Packages
    {
      name: 'Facial Gold + Bleach/D-Tan + Eyebrows/Underarms',
      categoryId: femalePkgCat.id,
      price: 499,
      validity: 365,
      services: [
        { name: 'Gold/Diamond/Fruit Facial' },
        { name: 'Eyebrow' },
      ],
      groups: [
        {
          label: 'Bleach / D-Tan Pack',
          services: [
            { name: 'Oxy Bleach' },
            { name: 'D-Tan Pack + Scrub Regular' },
          ],
        },
      ],
    },
    {
      name: 'Facial Raga + Oxy Bleach/D-Tan + Eyebrows + Hand Wax',
      categoryId: femalePkgCat.id,
      price: 2199,
      validity: 365,
      services: [
        { name: "Cheryl's/N3+/Nandini/Raga Facial" },
        { name: 'Eyebrow' },
        { name: 'Hand Wax With Underarms - Regular' },
      ],
      groups: [
        {
          label: 'Oxy Bleach / D-Tan Pack',
          services: [
            { name: 'Oxy Bleach' },
            { name: 'D-Tan Pack + Scrub Regular' },
          ],
        },
      ],
    },
    {
      name: 'Facial O3+ + Manicure + Hand Bleach + Eyebrows/Back Massage',
      categoryId: femalePkgCat.id,
      price: 2999,
      validity: 365,
      services: [
        { name: 'O3+ Whiting Facial' },
        { name: 'Manicure - Regular' },
        { name: 'Hand Bleach' },
      ],
      groups: [
        {
          label: 'Eyebrows / Head Massage',
          services: [
            { name: 'Eyebrow' },
            { name: 'Head Massage 20 min' },
          ],
        },
      ],
    },

    // Hair Treatment Packages
    {
      name: 'Advanced Hair Treatment - Botox',
      categoryId: hairTreatmentPkgCat.id,
      price: 3999,
      validity: 365,
      services: [{ name: 'Botox' }],
    },
    {
      name: 'Advanced Hair Treatment - Keratin',
      categoryId: hairTreatmentPkgCat.id,
      price: 3999,
      validity: 365,
      services: [{ name: 'Keratin Brazilion' }],
    },
    {
      name: 'Advanced Hair Treatment - Smoothing',
      categoryId: hairTreatmentPkgCat.id,
      price: 3999,
      validity: 365,
      services: [{ name: 'Smoothing Loreal' }],
    },
    {
      name: 'Advanced Hair Treatment - Nanoplastia',
      categoryId: hairTreatmentPkgCat.id,
      price: 3999,
      validity: 365,
      services: [{ name: 'Nanoplastia' }],
    },
    {
      name: 'Advanced Hair Treatment - Vegan',
      categoryId: hairTreatmentPkgCat.id,
      price: 3999,
      validity: 365,
      services: [{ name: 'Vegan' }],
    },
  ];

  for (const pkg of packagesData) {
    const created = await prisma.package.create({
      data: {
        packageName: pkg.name,
        categoryId: pkg.categoryId,
        packagePrice: pkg.price,
        validityDays: pkg.validity,
      },
    });

    // Create standalone services
    const standalone = (pkg.services || [])
      .filter((s) => svcMap[s.name])
      .map((s) => ({
        packageId: created.id,
        serviceId: svcMap[s.name],
        quantity: s.quantity || 1,
        groupId: null,
      }));

    if (standalone.length > 0) {
      await prisma.packageService.createMany({ data: standalone });
    }

    // Create OR groups
    if (pkg.groups) {
      for (let i = 0; i < pkg.groups.length; i++) {
        const g = pkg.groups[i];
        const group = await prisma.packageServiceGroup.create({
          data: {
            packageId: created.id,
            groupLabel: g.label,
            sortOrder: i,
          },
        });
        const groupServices = g.services
          .filter((s) => svcMap[s.name])
          .map((s) => ({
            packageId: created.id,
            serviceId: svcMap[s.name],
            quantity: s.quantity || 1,
            groupId: group.id,
          }));
        if (groupServices.length > 0) {
          await prisma.packageService.createMany({ data: groupServices });
        }
      }
    }
  }

  console.log('Created', packagesData.length, 'packages with linked services');

  // ============================================
  // 9. PRODUCT CATEGORIES & PRODUCTS
  // ============================================
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

  console.log('Created product categories and', products.length, 'products');

  // ============================================
  // 10. INVENTORY LOCATIONS
  // ============================================
  await prisma.inventoryLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      locationName: 'Central Store',
      locationType: 'central_store',
      address: 'Warehouse, Industrial Area, Nashik',
    },
  });

  await prisma.inventoryLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000021' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000021',
      locationName: 'Sarathes Store',
      locationType: 'branch_store',
      branchId: branch1.id,
    },
  });

  await prisma.inventoryLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000022' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000022',
      locationName: 'Ksagar Store',
      locationType: 'branch_store',
      branchId: branch2.id,
    },
  });

  console.log('Created inventory locations');

  // ============================================
  // 11. CHAIRS
  // ============================================
  for (let i = 1; i <= 5; i++) {
    await prisma.chair.upsert({
      where: {
        branchId_chairNumber: { branchId: branch1.id, chairNumber: `C${i.toString().padStart(2, '0')}` },
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
        branchId_chairNumber: { branchId: branch2.id, chairNumber: `C${i.toString().padStart(2, '0')}` },
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

  // ============================================
  // 12. EXPENSE CATEGORIES
  // ============================================
  const expenseCategories = [
    'Electricity Bill', 'Water Bill', 'Rent', 'Staff Salary',
    'Maintenance', 'Marketing', 'Supplies', 'Others',
  ];

  for (const name of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('Created expense categories');

  // ============================================
  // 13. SYSTEM SETTINGS
  // ============================================
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

  // ============================================
  // 14. FEATURES
  // ============================================
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

  // ============================================
  // 15. SAMPLE CUSTOMERS
  // ============================================
  const customers = [
    { name: 'Raj Kumar', phone: '9876543210', gender: 'male', age: 'young' },
    { name: 'Priya Sharma', phone: '9876543211', gender: 'female', age: 'young' },
    { name: 'Amit Singh', phone: '9876543212', gender: 'male', age: 'teen' },
    { name: 'Meera Patil', phone: '9876543213', gender: 'female', age: 'old' },
    { name: 'Vikram Joshi', phone: '9876543214', gender: 'male', age: 'young' },
  ];

  for (const customer of customers) {
    const phoneMasked = customer.phone.substring(0, 2) + '****' + customer.phone.substring(6);
    const existing = await prisma.customer.findFirst({ where: { phone: customer.phone } });
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

  // ============================================
  // DONE
  // ============================================
  console.log('\n========================================');
  console.log('Database seed completed successfully!');
  console.log('========================================\n');
  console.log('Branches:');
  console.log(`  1. ${branch1.name} (${branch1.code})`);
  console.log(`  2. ${branch2.name} (${branch2.code})`);
  console.log('\nLogin credentials (all use Password123!):');
  console.log('  - owner (all branches)');
  console.log('  - developer (all branches)');
  console.log('  - manager1 (Sarathes), manager2 (Ksagar)');
  console.log('  - cashier1 (Sarathes), cashier2 (Ksagar)');
  console.log('  - employee1 (Sarathes+Ksagar), employee2 (Sarathes)');
  console.log('  - employee3 (Ksagar), employee4 (Ksagar)');
  console.log('\nCatalog:');
  console.log(`  ${serviceCategories.length} service categories, ${servicesData.length} services`);
  console.log(`  3 package categories, ${packagesData.length} packages with linked services`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
