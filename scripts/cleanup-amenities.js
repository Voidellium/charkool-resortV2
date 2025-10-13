// Database cleanup script - Remove wrong amenities and create only the required 6 items
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupAndSeedAmenities() {
  console.log('🧹 Cleaning up amenity inventory database...');
  
  const requiredAmenities = [
    { name: 'Broom & Dustpan', quantity: 48, category: 'Cleaning Supplies' },
    { name: 'Extra Bed', quantity: 48, category: 'Furniture' },
    { name: 'Extra Blanket', quantity: 48, category: 'Bedding' },
    { name: 'Extra Pillow', quantity: 50, category: 'Bedding' },
    { name: 'Toiletries Kit', quantity: 47, category: 'Bathroom Essentials' },
    { name: 'Towels Set', quantity: 49, category: 'Bathroom Essentials' },
  ];

  try {
    // 1. First, delete ALL existing amenity inventory items
    console.log('🗑️ Removing all existing amenity inventory items...');
    const deleteResult = await prisma.amenityInventory.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.count} existing items`);

    // 2. Create only the required amenities
    console.log('\n📦 Creating required amenities...');
    for (const amenity of requiredAmenities) {
      const created = await prisma.amenityInventory.create({
        data: amenity
      });
      console.log(`✅ Created: ${amenity.name} - ${amenity.quantity} in stock (${amenity.category})`);
    }

    // 3. Verify the final result
    console.log('\n📋 Final Amenity Inventory:');
    const allAmenities = await prisma.amenityInventory.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`\n🎯 Total amenities: ${allAmenities.length} (should be 6)`);
    allAmenities.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}: ${item.quantity} in stock (${item.category})`);
    });

    if (allAmenities.length === 6) {
      console.log('\n🎉 SUCCESS! Database now contains exactly the 6 required amenities!');
    } else {
      console.log(`\n⚠️ WARNING: Expected 6 amenities but found ${allAmenities.length}`);
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupAndSeedAmenities();