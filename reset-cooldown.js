// Script to reset payment cooldown for development purposes
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetAllCooldowns() {
  try {
    console.log('🔄 Resetting all payment cooldowns...');
    
    const result = await prisma.user.updateMany({
      where: {
        OR: [
          { paymentCooldownUntil: { not: null } },
          { failedPaymentAttempts: { gt: 0 } }
        ]
      },
      data: {
        paymentCooldownUntil: null,
        failedPaymentAttempts: 0,
      },
    });

    console.log(`✅ Reset cooldown for ${result.count} users`);
    console.log('💡 Payment cooldowns have been cleared. You can now make new bookings.');
    
  } catch (error) {
    console.error('❌ Error resetting cooldowns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAllCooldowns();