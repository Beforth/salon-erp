const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const username = process.env.OWNER_USERNAME || 'owner';
  const password = process.env.OWNER_PASSWORD || 'Owner@123';
  const email = process.env.OWNER_EMAIL || 'owner@salon.com';
  const fullName = process.env.OWNER_NAME || 'Salon Owner';

  // Check if user already exists
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (existing) {
    console.error(`User with username "${username}" or email "${email}" already exists.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const owner = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      fullName: fullName,
      role: 'owner',
      branchId: null,
      isActive: true,
    },
  });

  console.log('Owner user created successfully!');
  console.log(`  Username: ${username}`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  User ID:  ${owner.id}`);
}

main()
  .catch((e) => {
    console.error('Error creating owner:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
