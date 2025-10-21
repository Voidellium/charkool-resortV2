const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🎨 Seeding current 3D model...');

  // Add the current active model
  const currentModel = await prisma.threeDModel.upsert({
    where: { fileName: 'WholeMap_Separated_Textured.gltf' },
    update: {},
    create: {
      name: 'Resort Main Map',
      fileName: 'WholeMap_Separated_Textured.gltf',
      filePath: '/models/WholeMap_Separated_Textured.gltf',
      fileType: 'GLTF',
      isActive: true,
      description: 'Current resort 3D model with separated textured components'
    }
  });

  console.log('✅ Current model seeded:', currentModel.name);

  // Add other existing models as inactive
  const otherModels = [
    {
      name: 'Villa Model',
      fileName: 'Villa.gltf',
      filePath: '/models/Villa.gltf',
      fileType: 'GLTF',
      isActive: false,
      description: 'Individual villa 3D model'
    },
    {
      name: 'Bilyaran Store',
      fileName: 'BilyaranStore.obj',
      filePath: '/models/BilyaranStore.obj',
      fileType: 'OBJ',
      isActive: false,
      description: 'Store building 3D model'
    },
    {
      name: 'Poolside Kubo',
      fileName: 'PoolsideKubo.obj',
      filePath: '/models/PoolsideKubo.obj',
      fileType: 'OBJ',
      isActive: false,
      description: 'Poolside kubo structure'
    },
    {
      name: 'Stage',
      fileName: 'Stage.obj',
      filePath: '/models/Stage.obj',
      fileType: 'OBJ',
      isActive: false,
      description: 'Performance stage 3D model'
    },
    {
      name: 'Teepee',
      fileName: 'Teepee.obj',
      filePath: '/models/Teepee.obj',
      fileType: 'OBJ',
      isActive: false,
      description: 'Teepee accommodation model'
    }
  ];

  for (const model of otherModels) {
    const result = await prisma.threeDModel.upsert({
      where: { fileName: model.fileName },
      update: {},
      create: model
    });
    console.log('📁 Model seeded:', result.name);
  }

  console.log('🎯 All existing 3D models have been seeded to the database!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });