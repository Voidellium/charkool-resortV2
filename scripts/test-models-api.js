const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing ThreeDModel database operations...');

  try {
    // Test if the table exists and we can query it
    const models = await prisma.threeDModel.findMany();
    console.log('✅ Successfully queried ThreeDModel table');
    console.log(`📊 Found ${models.length} models:`);
    
    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name} (${model.fileName}) - Active: ${model.isActive}`);
    });

    if (models.length === 0) {
      console.log('\n⚠️  No models found. This could be why the API is not working.');
      console.log('Try running: node scripts/seed-current-model.js');
    }

  } catch (error) {
    console.error('❌ Error querying ThreeDModel table:', error.message);
    console.log('\nThis might be why the developer dashboard API is failing.');
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