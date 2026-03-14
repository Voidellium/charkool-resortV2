const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedModelConfig() {
  try {
    console.log('🌱 Seeding 3D Model configurations...');

    const models = [
      {
        modelType: 'RESORT_MAP',
        modelPath: '/models/WholeMap_12.glb'
      },
      {
        modelType: 'INTERIOR_TEEPEE',
        modelPath: '/models/Interior_Teepee.glb'
      },
      {
        modelType: 'INTERIOR_VILLA',
        modelPath: '/models/Interior_Villa.glb'
      },
      {
        modelType: 'INTERIOR_LOFT',
        modelPath: '/models/Interior_Loft.glb'
      }
    ];

    for (const model of models) {
      const result = await prisma.threeDModelConfig.upsert({
        where: { modelType: model.modelType },
        update: { modelPath: model.modelPath },
        create: model
      });
      console.log(`✅ ${model.modelType}: ${model.modelPath}`);
    }

    console.log('✨ Model configuration seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding model config:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedModelConfig()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
