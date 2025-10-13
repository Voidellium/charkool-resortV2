// Quick script to check what amenity data exists
const { PrismaClient } = require('@prisma/client');

async function checkData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n=== Checking AmenityInventory ===');
    const amenityInventory = await prisma.amenityInventory.findMany();
    console.log('AmenityInventory count:', amenityInventory.length);
    console.log('Sample records:', amenityInventory.slice(0, 3));
    
    console.log('\n=== Checking OptionalAmenity ===');
    const optionalAmenity = await prisma.optionalAmenity.findMany();
    console.log('OptionalAmenity count:', optionalAmenity.length);
    console.log('Sample records:', optionalAmenity.slice(0, 3));
    
    console.log('\n=== Checking BookingAmenity connections ===');
    const bookingAmenities = await prisma.bookingAmenity.findMany({
      include: {
        amenity: true,
        booking: true
      }
    });
    console.log('BookingAmenity connections:', bookingAmenities.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();