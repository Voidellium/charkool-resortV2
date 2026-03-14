const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for users with legacy roles (GUEST, ADMIN, DEVELOPER)...\n');
  
  const usersWithLegacyRoles = await prisma.user.findMany({
    where: {
      role: {
        in: ['GUEST', 'ADMIN', 'DEVELOPER']
      }
    },
    select: {
      id: true,
      email: true,
      role: true,
      name: true
    }
  });
  
  if (usersWithLegacyRoles.length === 0) {
    console.log('✅ No users found with legacy roles. Safe to proceed with migration.');
  } else {
    console.log(`⚠️ Found ${usersWithLegacyRoles.length} user(s) with legacy roles:\n`);
    usersWithLegacyRoles.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
    });
    console.log('\nThese users need to be updated before removing legacy roles from schema.');
  }
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
