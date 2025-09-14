// updateSuperAdminRole.js
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@example.com'; // 👈 change this to your actual super admin email
  const password = 'alexpool92';          // 👈 change if you want another password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Try to update first, if not found -> create
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'superadmin' },
    create: {
      email,
      password: hashedPassword,
      role: 'superadmin',
    },
  });

  console.log('✅ Super admin ready:', user);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(() => prisma.$disconnect());
