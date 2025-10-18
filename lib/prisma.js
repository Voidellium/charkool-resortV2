import { PrismaClient } from '@prisma/client';

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
      errorFormat: 'pretty',
    });
  }
  prisma = global.prisma;
}

// Add connection error handling with retry logic
const connectWithRetry = async () => {
  let retries = 3;
  while (retries > 0) {
    try {
      await prisma.$connect();
      console.log('Database connected successfully');
      break;
    } catch (error) {
      console.error(`Database connection attempt failed (${4 - retries}/3):`, error);
      retries--;
      if (retries === 0) {
        console.error('All database connection attempts failed');
        // Don't exit in production, let individual requests handle failures
        if (process.env.NODE_ENV !== 'production') {
          process.exit(1);
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
      }
    }
  }
};

// Initialize connection
connectWithRetry();

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('Database disconnected gracefully');
});

export default prisma;