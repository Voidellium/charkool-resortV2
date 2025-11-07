/**
 * Seed Script: Clear Booking Data
 * 
 * This is a Prisma seed-compatible version of the booking data cleanup script.
 * Can be run directly or added to package.json as a seed script.
 * 
 * Usage:
 *   node prisma/clear-bookings-seed.js
 *   or
 *   npx prisma db seed (if configured in package.json)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Clearing all booking data...\n');

  try {
    // Delete in reverse order of dependencies to avoid foreign key constraint errors
    
    const results = {};

    // Booking remarks
    results.bookingRemarks = await prisma.bookingRemark.deleteMany({});
    
    // Reschedule requests
    results.rescheduleRequests = await prisma.rescheduleRequest.deleteMany({});
    
    // Payments
    results.payments = await prisma.payment.deleteMany({});
    
    // Booking cottages
    results.bookingCottages = await prisma.bookingCottage.deleteMany({});
    
    // Booking rental amenities
    results.bookingRentalAmenities = await prisma.bookingRentalAmenity.deleteMany({});
    
    // Booking optional amenities
    results.bookingOptionalAmenities = await prisma.bookingOptionalAmenity.deleteMany({});
    
    // Booking amenities (inventory)
    results.bookingAmenities = await prisma.bookingAmenity.deleteMany({});
    
    // Booking rooms
    results.bookingRooms = await prisma.bookingRoom.deleteMany({});
    
    // Booking notifications
    results.notifications = await prisma.notification.deleteMany({
      where: { bookingId: { not: null } }
    });
    
    // Finally, bookings themselves
    results.bookings = await prisma.booking.deleteMany({});

    // Reset room availability
    results.roomsReset = await prisma.room.updateMany({
      where: { status: { not: 'available' } },
      data: { status: 'available', heldUntil: null }
    });

    // Log results
    console.log('✅ Deletion Summary:');
    console.log(`   Bookings: ${results.bookings.count}`);
    console.log(`   Payments: ${results.payments.count}`);
    console.log(`   Booking Rooms: ${results.bookingRooms.count}`);
    console.log(`   Booking Amenities: ${results.bookingAmenities.count}`);
    console.log(`   Optional Amenities: ${results.bookingOptionalAmenities.count}`);
    console.log(`   Rental Amenities: ${results.bookingRentalAmenities.count}`);
    console.log(`   Cottages: ${results.bookingCottages.count}`);
    console.log(`   Reschedule Requests: ${results.rescheduleRequests.count}`);
    console.log(`   Booking Remarks: ${results.bookingRemarks.count}`);
    console.log(`   Notifications: ${results.notifications.count}`);
    console.log(`   Rooms Reset: ${results.roomsReset.count}\n`);
    
    console.log('✨ All booking data has been cleared successfully!');
    
    return results;
  } catch (error) {
    console.error('❌ Error during booking data cleanup:', error);
    throw error;
  }
}

main()
  .then(() => {
    console.log('✅ Cleanup completed');
  })
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

module.exports = { main };
