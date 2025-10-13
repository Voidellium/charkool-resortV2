// Quick script to check what amenity data exists
const { PrismaClient } = require('@prisma/client');

async function checkData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n=== Checking OptionalAmenity (Current Inventory Source) ===');
    const optionalAmenities = await prisma.optionalAmenity.findMany({
      where: { isActive: true }
    });
    console.log('OptionalAmenity count:', optionalAmenities.length);
    
    // Find Broom & Dustpan specifically
    const broomAmenity = optionalAmenities.find(a => a.name.includes('Broom') || a.name.includes('Dustpan'));
    if (broomAmenity) {
      console.log('\n=== Broom & Dustpan Details ===');
      console.log('ID:', broomAmenity.id);
      console.log('Name:', broomAmenity.name);
      console.log('MaxQuantity:', broomAmenity.maxQuantity);
      console.log('Description:', broomAmenity.description);
      console.log('IsActive:', broomAmenity.isActive);
      
      // Check bookings for this amenity
      console.log('\n=== Checking Bookings for Broom & Dustpan ===');
      const bookings = await prisma.bookingOptionalAmenity.findMany({
        where: {
          optionalAmenityId: broomAmenity.id,
          booking: {
            checkOut: { gt: new Date() }
          }
        },
        include: {
          booking: true
        }
      });
      console.log('Active bookings:', bookings.length);
      bookings.forEach(b => {
        console.log(`- Booking ${b.bookingId}: Quantity ${b.quantity}, CheckOut: ${b.booking.checkOut}`);
      });
    } else {
      console.log('Broom & Dustpan not found!');
      console.log('Available amenities:');
      optionalAmenities.forEach(a => console.log(`- ${a.name} (maxQuantity: ${a.maxQuantity})`));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();