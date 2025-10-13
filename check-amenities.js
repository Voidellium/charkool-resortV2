const { PrismaClient } = require('@prisma/client');

async function checkAmenities() {
  const prisma = new PrismaClient();
  
  try {
    const amenities = await prisma.amenityInventory.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log('Current Amenity Inventory:');
    console.log('=========================');
    
    amenities.forEach(amenity => {
      console.log(`${amenity.name}: ${amenity.quantity} in stock`);
    });
    
    console.log('\nLooking for specific amenities:');
    const targetAmenities = [
      'Broom & Dustpan',
      'Extra Bed', 
      'Extra Blanket',
      'Extra Pillow',
      'Toiletries Kit',
      'Towels Set'
    ];
    
    targetAmenities.forEach(targetName => {
      const found = amenities.find(a => a.name === targetName);
      if (found) {
        console.log(`✓ ${found.name}: ${found.quantity} in stock (ID: ${found.id})`);
      } else {
        console.log(`✗ ${targetName}: Not found in database`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAmenities();