import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { notifyStaff, CHANNELS, EVENTS } from '@/lib/pusher-server';

// POST - Request cancellation (ALL cancellations require admin approval)
export async function POST(req, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const bookingId = parseInt(id);
    const { reason } = await req.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 });
    }

    // Fetch the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        rooms: true,
        user: true,
        cancellationRequests: {
          where: { status: 'PENDING' },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify user owns this booking
    if (booking.userId !== session.user.id && !['SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized to cancel this booking' }, { status: 403 });
    }

    // Check booking status
    if (!['Created', 'Pending', 'Confirmed'].includes(booking.status)) {
      return NextResponse.json({ 
        error: `Cannot cancel booking with status: ${booking.status}` 
      }, { status: 400 });
    }

    // Check if already cancelled
    if (booking.status === 'Cancelled') {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
    }

    // Check if there's already a pending cancellation request
    if (booking.cancellationRequests.length > 0) {
      return NextResponse.json({ 
        error: 'A cancellation request is already pending for this booking' 
      }, { status: 400 });
    }

    // Calculate days until check-in
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    const daysUntilCheckIn = Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24));

    // Must be at least 1 day before check-in
    if (daysUntilCheckIn < 1) {
      return NextResponse.json({ 
        error: 'Cancellation not allowed within 24 hours of check-in' 
      }, { status: 400 });
    }

    // All cancellations now require admin approval - no more direct cancellation

    // Create cancellation request
    const cancellationRequest = await prisma.cancellationRequest.create({
      data: {
        bookingId,
        userId: session.user.id,
        reason: reason.trim(),
        status: 'PENDING',
        refundAmount: 0, // No refund for cancellations within 7 days
      },
    });

    // Update booking status to CancellationPending
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CancellationPending',
        updatedAt: new Date(),
      },
    });

    // Create notification for super admin
    await prisma.notification.create({
      data: {
        message: `New cancellation request for Booking #${bookingId} from ${booking.user?.firstName} ${booking.user?.lastName}`,
        type: 'cancellation_request',
        role: 'SUPERADMIN',
        bookingId: bookingId,
      },
    });

    // 🔔 PUSHER: Notify SuperAdmin in real-time about new cancellation request
    try {
      await notifyStaff('SUPERADMIN', {
        type: 'cancellation_request',
        message: `New cancellation request for Booking #${bookingId} from ${booking.user?.firstName} ${booking.user?.lastName}`,
        bookingId: bookingId,
        requestId: cancellationRequest.id,
        reason: reason.trim(),
        guestName: booking.guestName || `${booking.user?.firstName} ${booking.user?.lastName}`,
      });
      console.log(`[Pusher] Notified SuperAdmin about new cancellation request #${cancellationRequest.id}`);
    } catch (pusherErr) {
      console.warn('[Pusher] Failed to notify about cancellation request:', pusherErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Cancellation request submitted successfully',
      cancellationRequest,
    });

  } catch (error) {
    console.error('❌ Cancel request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit cancellation request', details: error.message },
      { status: 500 }
    );
  }
}
