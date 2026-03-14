const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🛠️ Creating developer test user...');

  const hashedPassword = await bcrypt.hash('developer123', 12);

  const developer = await prisma.user.upsert({
    where: { email: 'developer@charkool.com' },
    update: {},
    create: {
      firstName: 'Dev',
      lastName: 'User',
      email: 'developer@charkool.com',
      password: hashedPassword,
      role: 'DEVELOPER',
      birthdate: new Date('1990-01-01'),
      contactNumber: '+63 9123456789',
      redirectUrl: '/developer/dashboard'
    }
  });

  console.log('✅ Developer user created:', {
    email: developer.email,
    role: developer.role,
    name: `${developer.firstName} ${developer.lastName}`
  });

  console.log('\n📋 Login Credentials:');
  console.log('Email: developer@charkool.com');
  console.log('Password: developer123');
  console.log('Role: DEVELOPER');
  console.log('Dashboard: /developer/dashboard');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });