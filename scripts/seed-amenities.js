// Seed script to ensure specific amenities exist in AmenityInventory
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedAmenities() {
  console.log('🌱 Seeding amenity inventory...');
  
  const requiredAmenities = [
    { name: 'Broom & Dustpan', quantity: 48, category: 'Cleaning Supplies' },
    { name: 'Extra Bed', quantity: 48, category: 'Furniture' },
    { name: 'Extra Blanket', quantity: 48, category: 'Bedding' },
    { name: 'Extra Pillow', quantity: 50, category: 'Bedding' },
    { name: 'Toiletries Kit', quantity: 47, category: 'Bathroom Essentials' },
    { name: 'Towels Set', quantity: 49, category: 'Bathroom Essentials' },
  ];

  try {
    for (const amenity of requiredAmenities) {
      // Check if amenity already exists
      const existing = await prisma.amenityInventory.findFirst({
        where: { name: amenity.name }
      });

      if (existing) {
        // Update existing amenity to match required quantity
        await prisma.amenityInventory.update({
          where: { id: existing.id },
          data: { 
            quantity: amenity.quantity,
            category: amenity.category
          }
        });
        console.log(`✅ Updated: ${amenity.name} - ${amenity.quantity} in stock`);
      } else {
        // Create new amenity
        await prisma.amenityInventory.create({
          data: amenity
        });
        console.log(`✅ Created: ${amenity.name} - ${amenity.quantity} in stock`);
      }
    }

    // Display final inventory
    console.log('\n📋 Current Amenity Inventory:');
    const allAmenities = await prisma.amenityInventory.findMany({
      orderBy: { name: 'asc' }
    });

    allAmenities.forEach(item => {
      console.log(`${item.name}: ${item.quantity} in stock (${item.category || 'General'})`);
    });

    console.log('\n🎉 Amenity inventory seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding amenities:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  seedAmenities();
}

module.exports = { seedAmenities };