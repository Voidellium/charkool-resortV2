/**
 * Clear Booking Data Script
 * 
 * This script safely deletes all booking-related data from the database
 * without using Prisma reset, which would delete all data.
 * 
 * Usage:
 *   node scripts/clear-booking-data.js
 * 
 * To run with confirmation prompt:
 *   node scripts/clear-booking-data.js --confirm
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearBookingData() {
  try {
    console.log('🗑️  Starting booking data cleanup...\n');

    // Delete in order to respect foreign key constraints
    
    // 1. Delete booking remarks
    const remarksDeleted = await prisma.bookingRemark.deleteMany({});
    console.log(`✅ Deleted ${remarksDeleted.count} booking remarks`);

    // 2. Delete reschedule requests
    const rescheduleDeleted = await prisma.rescheduleRequest.deleteMany({});
    console.log(`✅ Deleted ${rescheduleDeleted.count} reschedule requests`);

    // 3. Delete payments
    const paymentsDeleted = await prisma.payment.deleteMany({});
    console.log(`✅ Deleted ${paymentsDeleted.count} payments`);

    // 4. Delete booking cottage relationships
    const cottagesDeleted = await prisma.bookingCottage.deleteMany({});
    console.log(`✅ Deleted ${cottagesDeleted.count} booking cottage entries`);

    // 5. Delete booking rental amenities
    const rentalAmenitiesDeleted = await prisma.bookingRentalAmenity.deleteMany({});
    console.log(`✅ Deleted ${rentalAmenitiesDeleted.count} booking rental amenities`);

    // 6. Delete booking optional amenities
    const optionalAmenitiesDeleted = await prisma.bookingOptionalAmenity.deleteMany({});
    console.log(`✅ Deleted ${optionalAmenitiesDeleted.count} booking optional amenities`);

    // 7. Delete booking amenities (inventory)
    const amenitiesDeleted = await prisma.bookingAmenity.deleteMany({});
    console.log(`✅ Deleted ${amenitiesDeleted.count} booking amenity inventory entries`);

    // 8. Delete booking rooms
    const roomsDeleted = await prisma.bookingRoom.deleteMany({});
    console.log(`✅ Deleted ${roomsDeleted.count} booking room entries`);

    // 9. Delete notifications related to bookings
    const notificationsDeleted = await prisma.notification.deleteMany({
      where: {
        bookingId: {
          not: null
        }
      }
    });
    console.log(`✅ Deleted ${notificationsDeleted.count} booking notifications`);

    // 10. Finally, delete all bookings
    const bookingsDeleted = await prisma.booking.deleteMany({});
    console.log(`✅ Deleted ${bookingsDeleted.count} bookings`);

    // Reset room statuses to available (optional)
    const roomsReset = await prisma.room.updateMany({
      where: {
        status: {
          not: 'available'
        }
      },
      data: {
        status: 'available',
        heldUntil: null
      }
    });
    console.log(`✅ Reset ${roomsReset.count} rooms to available status`);

    // Optional: Reset amenity quantities to default (if needed)
    // Uncomment if you want to reset amenity stock levels
    /*
    const optionalAmenitiesReset = await prisma.optionalAmenity.updateMany({
      data: {
        quantity: 0 // or set to your default stock level
      }
    });
    console.log(`✅ Reset ${optionalAmenitiesReset.count} optional amenity quantities`);

    const rentalAmenitiesReset = await prisma.rentalAmenity.updateMany({
      data: {
        quantity: 0 // or set to your default stock level
      }
    });
    console.log(`✅ Reset ${rentalAmenitiesReset.count} rental amenity quantities`);
    */

    console.log('\n✨ Booking data cleanup completed successfully!');
    console.log('\nSummary:');
    console.log(`  - ${bookingsDeleted.count} bookings removed`);
    console.log(`  - ${paymentsDeleted.count} payments removed`);
    console.log(`  - ${roomsDeleted.count} room assignments removed`);
    console.log(`  - ${amenitiesDeleted.count + optionalAmenitiesDeleted.count + rentalAmenitiesDeleted.count + cottagesDeleted.count} amenity assignments removed`);
    console.log(`  - ${rescheduleDeleted.count} reschedule requests removed`);
    console.log(`  - ${remarksDeleted.count} booking remarks removed`);
    console.log(`  - ${notificationsDeleted.count} notifications removed`);
    console.log(`  - ${roomsReset.count} rooms reset to available\n`);

  } catch (error) {
    console.error('❌ Error clearing booking data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Check for confirmation flag
const args = process.argv.slice(2);
const needsConfirmation = !args.includes('--confirm') && !args.includes('-y');

if (needsConfirmation) {
  console.log('⚠️  WARNING: This will delete ALL booking data from the database!');
  console.log('This includes:');
  console.log('  - All bookings');
  console.log('  - All payments');
  console.log('  - All booking-related amenities');
  console.log('  - All reschedule requests');
  console.log('  - All booking remarks');
  console.log('  - Booking notifications');
  console.log('\nUser data, rooms, and amenity definitions will NOT be deleted.\n');
  console.log('To proceed, run this command with --confirm flag:');
  console.log('  node scripts/clear-booking-data.js --confirm\n');
  process.exit(0);
} else {
  // Run the cleanup
  clearBookingData()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
