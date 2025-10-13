// Create test amenity inventory data that matches what user expects
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAmenityData() {
  try {
    console.log('🔧 Creating amenity inventory data...\n');
    
    const amenityData = [
      { name: 'Broom & Dustpan', quantity: 48, category: 'Cleaning' },
      { name: 'Extra Bed', quantity: 48, category: 'Furniture' },
      { name: 'Extra Blanket', quantity: 48, category: 'Bedding' },
      { name: 'Extra Pillow', quantity: 50, category: 'Bedding' },
      { name: 'Toiletries Kit', quantity: 47, category: 'Bathroom' },
      { name: 'Towels Set', quantity: 49, category: 'Bathroom' },
    ];
    
    // Clear existing data first
    await prisma.amenityInventory.deleteMany({});
    console.log('✅ Cleared existing amenity inventory data');
    
    // Create new data
    for (const amenity of amenityData) {
      await prisma.amenityInventory.create({
        data: amenity
      });
      console.log(`✅ Created: ${amenity.name} - ${amenity.quantity} in stock`);
    }
    
    console.log('\n🎉 Successfully created all amenity inventory data!');
    
    // Verify the data
    const allAmenities = await prisma.amenityInventory.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log('\n📋 Final inventory:');
    allAmenities.forEach(item => {
      console.log(`${item.name}: ${item.quantity} in stock`);
    });
    
  } catch (error) {
    console.error('❌ Error creating data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAmenityData();