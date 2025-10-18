import prisma from './lib/prisma.js';

async function testBookingsAPI() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✓ Database connected successfully');
    
    // Test if we can query the booking model
    console.log('Testing booking query...');
    const bookingCount = await prisma.booking.count();
    console.log(`✓ Found ${bookingCount} bookings in database`);
    
    // Test the actual query used in the API
    console.log('Testing the full booking query from API...');
    const bookings = await prisma.booking.findMany({
      include: {
        user: true,
        rooms: { include: { room: true } },
        payments: true,
        amenities: { include: { amenity: true } },
        optionalAmenities: { include: { optionalAmenity: true } },
        rentalAmenities: { include: { rentalAmenity: true } },
        cottage: { include: { cottage: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1 // Just get one record for testing
    });
    
    console.log('✓ Successfully fetched bookings with relations');
    console.log(`Sample booking:`, bookings[0] ? 'Found' : 'No bookings available');
    
  } catch (error) {
    console.error('❌ Error testing bookings API:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

testBookingsAPI();