/**
 * Selective Booking Data Cleanup Script
 * 
 * This script allows you to delete bookings based on specific criteria:
 * - By date range
 * - By status
 * - By user
 * - Combinations of the above
 * 
 * Usage:
 *   node scripts/clear-booking-data-selective.js --help
 *   node scripts/clear-booking-data-selective.js --before="2024-01-01"
 *   node scripts/clear-booking-data-selective.js --status="Cancelled"
 *   node scripts/clear-booking-data-selective.js --older-than-days=90
 */

const { PrismaClient, BookingStatus } = require('@prisma/client');
const prisma = new PrismaClient();

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    confirm: false,
    before: null,
    after: null,
    status: null,
    userId: null,
    olderThanDays: null,
    help: false
  };

  args.forEach(arg => {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--confirm' || arg === '-y') {
      options.confirm = true;
    } else if (arg.startsWith('--before=')) {
      options.before = new Date(arg.split('=')[1]);
    } else if (arg.startsWith('--after=')) {
      options.after = new Date(arg.split('=')[1]);
    } else if (arg.startsWith('--status=')) {
      options.status = arg.split('=')[1];
    } else if (arg.startsWith('--user-id=')) {
      options.userId = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--older-than-days=')) {
      options.olderThanDays = parseInt(arg.split('=')[1]);
    }
  });

  return options;
}

function showHelp() {
  console.log(`
📚 Selective Booking Data Cleanup Script

Usage:
  node scripts/clear-booking-data-selective.js [OPTIONS]

Options:
  --help, -h                    Show this help message
  --confirm, -y                 Confirm deletion (required to execute)
  --before=YYYY-MM-DD          Delete bookings created before this date
  --after=YYYY-MM-DD           Delete bookings created after this date
  --status=STATUS              Delete bookings with specific status
                               (Pending, Confirmed, CheckedIn, CheckedOut, Cancelled, Expired)
  --user-id=ID                 Delete bookings for specific user ID
  --older-than-days=DAYS       Delete bookings older than X days

Examples:
  # Delete all cancelled bookings
  node scripts/clear-booking-data-selective.js --status=Cancelled --confirm

  # Delete bookings older than 90 days
  node scripts/clear-booking-data-selective.js --older-than-days=90 --confirm

  # Delete all bookings before 2024
  node scripts/clear-booking-data-selective.js --before=2024-01-01 --confirm

  # Delete cancelled and expired bookings
  node scripts/clear-booking-data-selective.js --status=Cancelled --confirm
  node scripts/clear-booking-data-selective.js --status=Expired --confirm

⚠️  Always backup your database before running destructive operations!
  `);
}

async function buildWhereClause(options) {
  const where = {};

  if (options.before) {
    where.createdAt = { ...where.createdAt, lt: options.before };
  }

  if (options.after) {
    where.createdAt = { ...where.createdAt, gt: options.after };
  }

  if (options.olderThanDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.olderThanDays);
    where.createdAt = { ...where.createdAt, lt: cutoffDate };
  }

  if (options.status) {
    where.status = options.status;
  }

  if (options.userId) {
    where.userId = options.userId;
  }

  return where;
}

async function clearSelectiveBookingData(options) {
  try {
    const where = await buildWhereClause(options);

    console.log('🔍 Finding bookings to delete with criteria:');
    console.log(JSON.stringify(where, null, 2));
    console.log();

    // First, find the bookings that match the criteria
    const bookingsToDelete = await prisma.booking.findMany({
      where,
      select: { id: true }
    });

    const bookingIds = bookingsToDelete.map(b => b.id);

    if (bookingIds.length === 0) {
      console.log('ℹ️  No bookings found matching the criteria.');
      return;
    }

    console.log(`📊 Found ${bookingIds.length} booking(s) to delete.\n`);

    if (!options.confirm) {
      console.log('⚠️  Dry run mode. Use --confirm to actually delete these bookings.\n');
      
      // Show sample of bookings that would be deleted
      const sampleBookings = await prisma.booking.findMany({
        where: { id: { in: bookingIds.slice(0, 5) } },
        select: {
          id: true,
          guestName: true,
          checkIn: true,
          checkOut: true,
          status: true,
          createdAt: true,
          totalPrice: true
        }
      });

      console.log('Sample of bookings that would be deleted:');
      console.table(sampleBookings);
      
      if (bookingIds.length > 5) {
        console.log(`... and ${bookingIds.length - 5} more\n`);
      }
      
      console.log('Run with --confirm to proceed with deletion.');
      return;
    }

    console.log('🗑️  Starting selective booking data cleanup...\n');

    const whereBookingIds = { bookingId: { in: bookingIds } };

    // Delete related records in order
    const remarksDeleted = await prisma.bookingRemark.deleteMany({
      where: whereBookingIds
    });
    console.log(`✅ Deleted ${remarksDeleted.count} booking remarks`);

    const rescheduleDeleted = await prisma.rescheduleRequest.deleteMany({
      where: whereBookingIds
    });
    console.log(`✅ Deleted ${rescheduleDeleted.count} reschedule requests`);

    const paymentsDeleted = await prisma.payment.deleteMany({
      where: whereBookingIds
    });
    console.log(`✅ Deleted ${paymentsDeleted.count} payments`);

    const cottagesDeleted = await prisma.bookingCottage.deleteMany({
      where: whereBookingIds
    });
    console.log(`✅ Deleted ${cottagesDeleted.count} booking cottage entries`);

    const rentalAmenitiesDeleted = await prisma.bookingRentalAmenity.deleteMany({
      where: whereBookingIds
    });
    console.log(`✅ Deleted ${rentalAmenitiesDeleted.count} booking rental amenities`);

    const optionalAmenitiesDeleted = await prisma.bookingOptionalAmenity.deleteMany({
      where: whereBookingIds
    });
    console.log(`✅ Deleted ${optionalAmenitiesDeleted.count} booking optional amenities`);

    const amenitiesDeleted = await prisma.bookingAmenity.deleteMany({
      where: whereBookingIds
    });
    console.log(`✅ Deleted ${amenitiesDeleted.count} booking amenity inventory entries`);

    const roomsDeleted = await prisma.bookingRoom.deleteMany({
      where: whereBookingIds
    });
    console.log(`✅ Deleted ${roomsDeleted.count} booking room entries`);

    const notificationsDeleted = await prisma.notification.deleteMany({
      where: { bookingId: { in: bookingIds } }
    });
    console.log(`✅ Deleted ${notificationsDeleted.count} booking notifications`);

    // Finally, delete the bookings
    const bookingsDeleted = await prisma.booking.deleteMany({
      where: { id: { in: bookingIds } }
    });
    console.log(`✅ Deleted ${bookingsDeleted.count} bookings`);

    console.log('\n✨ Selective booking data cleanup completed successfully!');
    console.log('\nSummary:');
    console.log(`  - ${bookingsDeleted.count} bookings removed`);
    console.log(`  - ${paymentsDeleted.count} payments removed`);
    console.log(`  - ${roomsDeleted.count} room assignments removed`);
    console.log(`  - ${amenitiesDeleted.count + optionalAmenitiesDeleted.count + rentalAmenitiesDeleted.count + cottagesDeleted.count} amenity assignments removed`);
    console.log(`  - ${rescheduleDeleted.count} reschedule requests removed`);
    console.log(`  - ${remarksDeleted.count} booking remarks removed`);
    console.log(`  - ${notificationsDeleted.count} notifications removed\n`);

  } catch (error) {
    console.error('❌ Error during selective cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const options = parseArgs();

if (options.help) {
  showHelp();
  process.exit(0);
}

clearSelectiveBookingData(options)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
