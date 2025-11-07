/**
 * Test Script for Booking Data Cleanup
 * 
 * This script verifies that the cleanup scripts work correctly
 * by checking booking counts before and after.
 * 
 * Usage:
 *   node scripts/test-booking-cleanup.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getBookingCounts() {
  const counts = {
    bookings: await prisma.booking.count(),
    payments: await prisma.payment.count(),
    bookingRooms: await prisma.bookingRoom.count(),
    bookingAmenities: await prisma.bookingAmenity.count(),
    optionalAmenities: await prisma.bookingOptionalAmenity.count(),
    rentalAmenities: await prisma.bookingRentalAmenity.count(),
    cottages: await prisma.bookingCottage.count(),
    rescheduleRequests: await prisma.rescheduleRequest.count(),
    bookingRemarks: await prisma.bookingRemark.count(),
    bookingNotifications: await prisma.notification.count({
      where: { bookingId: { not: null } }
    })
  };

  return counts;
}

async function getBookingsByStatus() {
  const statuses = await prisma.booking.groupBy({
    by: ['status'],
    _count: {
      status: true
    }
  });

  return statuses;
}

async function getRoomStatuses() {
  const statuses = await prisma.room.groupBy({
    by: ['status'],
    _count: {
      status: true
    }
  });

  return statuses;
}

async function main() {
  console.log('📊 Booking Data Statistics\n');
  console.log('='.repeat(50));

  // Get overall counts
  const counts = await getBookingCounts();
  
  console.log('\n📈 Overall Counts:');
  console.log(`   Bookings:                ${counts.bookings}`);
  console.log(`   Payments:                ${counts.payments}`);
  console.log(`   Booking Rooms:           ${counts.bookingRooms}`);
  console.log(`   Booking Amenities:       ${counts.bookingAmenities}`);
  console.log(`   Optional Amenities:      ${counts.optionalAmenities}`);
  console.log(`   Rental Amenities:        ${counts.rentalAmenities}`);
  console.log(`   Cottages:                ${counts.cottages}`);
  console.log(`   Reschedule Requests:     ${counts.rescheduleRequests}`);
  console.log(`   Booking Remarks:         ${counts.bookingRemarks}`);
  console.log(`   Booking Notifications:   ${counts.bookingNotifications}`);

  // Get bookings by status
  const bookingsByStatus = await getBookingsByStatus();
  
  if (bookingsByStatus.length > 0) {
    console.log('\n📋 Bookings by Status:');
    bookingsByStatus.forEach(item => {
      console.log(`   ${item.status.padEnd(15)} ${item._count.status}`);
    });
  } else {
    console.log('\n📋 Bookings by Status: None');
  }

  // Get room statuses
  const roomStatuses = await getRoomStatuses();
  
  if (roomStatuses.length > 0) {
    console.log('\n🏠 Room Statuses:');
    roomStatuses.forEach(item => {
      console.log(`   ${item.status.padEnd(15)} ${item._count.status}`);
    });
  }

  // Get sample of recent bookings
  const recentBookings = await prisma.booking.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      guestName: true,
      checkIn: true,
      checkOut: true,
      status: true,
      createdAt: true
    }
  });

  if (recentBookings.length > 0) {
    console.log('\n🔍 Recent Bookings (last 5):');
    console.table(recentBookings);
  }

  console.log('\n='.repeat(50));
  console.log('\n💡 Tips:');
  console.log('   - To clear ALL bookings: node scripts/clear-booking-data.js --confirm');
  console.log('   - To clear by criteria: node scripts/clear-booking-data-selective.js --help');
  console.log('   - To clear cancelled: node scripts/clear-booking-data-selective.js --status=Cancelled --confirm');
  console.log('   - To clear old data: node scripts/clear-booking-data-selective.js --older-than-days=90 --confirm\n');
}

main()
  .then(() => {
    console.log('✅ Statistics retrieved successfully');
  })
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
