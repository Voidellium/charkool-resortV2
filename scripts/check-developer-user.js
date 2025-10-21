const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking developer user...');

  try {
    const developer = await prisma.user.findUnique({
      where: { email: 'developer@charkool.com' }
    });

    if (developer) {
      console.log('✅ Developer user found:', {
        id: developer.id,
        email: developer.email,
        role: developer.role,
        name: `${developer.firstName} ${developer.lastName}`,
        hasPassword: !!developer.password
      });
    } else {
      console.log('❌ Developer user not found!');
    }

    // Let's also check what roles are available
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        firstName: true,
        lastName: true
      }
    });

    console.log('\n📋 All users and their roles:');
    allUsers.forEach(user => {
      console.log(`- ${user.email}: ${user.role} (${user.firstName} ${user.lastName || ''})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });