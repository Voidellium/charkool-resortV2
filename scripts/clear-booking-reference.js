/**
 * QUICK REFERENCE: Clear Booking Data
 * 
 * This file provides quick commands for clearing booking data.
 * See docs/CLEAR_BOOKING_DATA.md for full documentation.
 */

// ========================================
// QUICK COMMANDS
// ========================================

// 1. Safe method with confirmation
// node scripts/clear-booking-data.js --confirm

// 2. Quick execution (no confirmation)
// node prisma/clear-bookings-seed.js

// ========================================
// WHAT GETS DELETED
// ========================================
// ✅ Bookings
// ✅ Payments  
// ✅ Booking room assignments
// ✅ Booking amenities (all types)
// ✅ Reschedule requests
// ✅ Booking remarks
// ✅ Booking notifications
// ✅ Rooms reset to "available"

// ========================================
// WHAT IS PRESERVED
// ========================================
// ❌ Users
// ❌ Rooms & room definitions
// ❌ Amenity definitions
// ❌ System logs
// ❌ Other non-booking data

// ========================================
// RECOMMENDED PACKAGE.JSON SCRIPTS
// ========================================
// Add to package.json "scripts" section:
/*
{
  "scripts": {
    "clear-bookings": "node scripts/clear-booking-data.js",
    "clear-bookings:force": "node scripts/clear-booking-data.js --confirm"
  }
}
*/

// Then use:
// npm run clear-bookings        (shows warning)
// npm run clear-bookings:force  (executes immediately)

// ========================================
// IMPLEMENTATION EXAMPLE
// ========================================

const { PrismaClient } = require('@prisma/client');

async function exampleClearBookings() {
  const prisma = new PrismaClient();
  
  try {
    // Delete in this order to respect foreign keys:
    await prisma.bookingRemark.deleteMany({});
    await prisma.rescheduleRequest.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.bookingCottage.deleteMany({});
    await prisma.bookingRentalAmenity.deleteMany({});
    await prisma.bookingOptionalAmenity.deleteMany({});
    await prisma.bookingAmenity.deleteMany({});
    await prisma.bookingRoom.deleteMany({});
    await prisma.notification.deleteMany({ where: { bookingId: { not: null } } });
    await prisma.booking.deleteMany({});
    await prisma.room.updateMany({ 
      where: { status: { not: 'available' } },
      data: { status: 'available', heldUntil: null }
    });
    
    console.log('✅ All booking data cleared');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ========================================
// BACKUP REMINDER
// ========================================
// Always backup your database first!
// pg_dump -U username -d database_name -f backup.sql
