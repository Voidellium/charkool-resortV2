import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

// POST - Direct cancellation (>= 7 days before check-in)
export async function POST(req, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const bookingId = parseInt(id);

    // Fetch the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        rooms: true,
        payments: true,
        user: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify user owns this booking or is admin
    if (booking.userId !== session.user.id && !['SUPERADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized to cancel this booking' }, { status: 403 });
    }

    // Check booking status - can only cancel Created, Pending, or Confirmed bookings
    if (!['Created', 'Pending', 'Confirmed'].includes(booking.status)) {
      return NextResponse.json({ 
        error: `Cannot cancel booking with status: ${booking.status}` 
      }, { status: 400 });
    }

    // Check if already cancelled
    if (booking.status === 'Cancelled') {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
    }

    // Calculate days until check-in
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    const daysUntilCheckIn = Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24));

    // Must be at least 7 days before check-in for direct cancellation
    if (daysUntilCheckIn < 7) {
      return NextResponse.json({ 
        error: 'Direct cancellation not allowed. Please submit a cancellation request for admin review.' 
      }, { status: 400 });
    }

    // Calculate 50% refund of reservation fee
    const totalRooms = booking.rooms.reduce((sum, r) => sum + (r.quantity || 1), 0);
    const reservationFee = totalRooms * 2000; // ₱2000 per room
    const refundAmount = Math.floor(reservationFee * 0.5); // 50% refund

    // Update booking status to Cancelled
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'Cancelled',
        paymentStatus: 'Refunded',
        cancellationRemarks: `Direct cancellation - ${daysUntilCheckIn} days before check-in. Refund: ₱${refundAmount.toLocaleString()} (50% of reservation fee)`,
        updatedAt: new Date(),
      },
    });

    // Create notification for guest
    await prisma.notification.create({
      data: {
        message: `Your cancellation request for booking on ${new Date(booking.checkIn).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} to ${new Date(booking.checkOut).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} is successful.`,
        type: 'cancellation_confirmed',
        role: 'CUSTOMER',
        bookingId: bookingId,
        userId: booking.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: updatedBooking,
      refundAmount,
    });

  } catch (error) {
    console.error('❌ Cancel booking error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking', details: error.message },
      { status: 500 }
    );
  }
}
