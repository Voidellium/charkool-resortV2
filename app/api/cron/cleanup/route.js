import { NextResponse } from "next/server";
import prisma from "../../../../src/lib/prisma";

/**
 * GET /api/cron/cleanup
 * Auto-cleanup cron job - runs every 2 days
 * This endpoint should be called by a cron service (Vercel Cron, external cron, etc.)
 */
export async function GET(request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-here';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = {
      logsDeleted: 0,
      otpsDeleted: 0,
      sessionsDeleted: 0,
      auditTrailsDeleted: 0,
      bookingsExpired: 0
    };

    // 1. Delete old system logs (older than 5 days)
    const logCutoffDate = new Date();
    logCutoffDate.setDate(logCutoffDate.getDate() - 5);
    
    const logsResult = await prisma.systemLog.deleteMany({
      where: {
        timestamp: { lt: logCutoffDate }
      }
    });
    results.logsDeleted = logsResult.count;

    // 2. Delete expired OTPs (older than 24 hours)
    const otpCutoffDate = new Date();
    otpCutoffDate.setHours(otpCutoffDate.getHours() - 24);
    
    const otpsResult = await prisma.oTP.deleteMany({
      where: {
        createdAt: { lt: otpCutoffDate }
      }
    });
    results.otpsDeleted = otpsResult.count;

    // 3. Delete expired sessions
    const now = new Date();
    const sessionsResult = await prisma.session.deleteMany({
      where: {
        expires: { lt: now }
      }
    });
    results.sessionsDeleted = sessionsResult.count;

    // 4. Delete old audit trails (older than 90 days)
    const auditCutoffDate = new Date();
    auditCutoffDate.setDate(auditCutoffDate.getDate() - 90);
    
    const auditResult = await prisma.auditTrail.deleteMany({
      where: {
        timestamp: { lt: auditCutoffDate }
      }
    });
    results.auditTrailsDeleted = auditResult.count;

    // 5. Auto-expire Pending bookings with passed check-in dates
    // Find pending bookings where check-in date has passed (+ 1 day grace period)
    const expiryGracePeriod = new Date();
    expiryGracePeriod.setDate(expiryGracePeriod.getDate() - 1); // Yesterday
    
    try {
      // Find all pending bookings that should be expired
      const expiredBookings = await prisma.booking.findMany({
        where: {
          status: 'Pending',
          checkIn: { lt: expiryGracePeriod },
          paymentStatus: { notIn: ['Reservation', 'Paid'] },
        },
        include: {
          optionalAmenities: true,
          rentalAmenities: true,
        },
      });

      // Process each expired booking in a transaction to restore stocks
      for (const booking of expiredBookings) {
        try {
          await prisma.$transaction(async (tx) => {
            // Restore optional amenity stocks
            for (const oa of (booking.optionalAmenities || [])) {
              await tx.optionalAmenity.update({
                where: { id: oa.optionalAmenityId },
                data: { quantity: { increment: oa.quantity } },
              });
            }

            // Restore rental amenity stocks
            for (const ra of (booking.rentalAmenities || [])) {
              await tx.rentalAmenity.update({
                where: { id: ra.rentalAmenityId },
                data: { quantity: { increment: ra.quantity } },
              });
            }

            // Update booking status to Expired
            await tx.booking.update({
              where: { id: booking.id },
              data: {
                status: 'Expired',
                heldUntil: null,
                cancellationRemarks: 'Auto-expired: Check-in date passed without payment completion',
              },
            });

            results.bookingsExpired++;
          });
        } catch (txError) {
          console.error(`Failed to expire booking ${booking.id}:`, txError);
          // Continue with other bookings
        }
      }

      console.log(`Auto-expired ${results.bookingsExpired} pending bookings with passed check-in dates`);
    } catch (bookingError) {
      console.error('Error expiring pending bookings:', bookingError);
      // Don't fail the entire cleanup job if this fails
    }

    console.log('Auto-cleanup completed:', results);

    return NextResponse.json({ 
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Auto-cleanup error:", error);
    return NextResponse.json(
      { error: "Cleanup failed", details: error.message },
      { status: 500 }
    );
  }
}
