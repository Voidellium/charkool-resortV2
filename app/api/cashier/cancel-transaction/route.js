import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    
    if (!role || (role !== 'CASHIER' && role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { bookingId, cancellationReason, cancelledBy, cancelledById } = await req.json();

    if (!bookingId || !cancellationReason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`🔄 Cancelling booking ${bookingId}`);

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      include: {
        user: true,
        rooms: {
          include: {
            room: true
          }
        },
        payments: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Update booking status to Cancelled
    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(bookingId) },
      data: {
        status: 'Cancelled',
        paymentStatus: 'Cancelled',
        cancellationRemarks: cancellationReason,
      },
    });

    // Update all associated payments to Cancelled status
    await prisma.payment.updateMany({
      where: { bookingId: parseInt(bookingId) },
      data: {
        status: 'Cancelled',
      }
    });

    // Make rooms available again by resetting their status and clearing heldUntil
    for (const bookingRoom of booking.rooms) {
      await prisma.room.update({
        where: { id: bookingRoom.roomId },
        data: {
          status: 'available',
          heldUntil: null
        }
      });
    }

    // Create notification for guest
    if (booking.userId) {
      await prisma.notification.create({
        data: {
          message: `Your booking #${bookingId} has been cancelled. Reason: ${cancellationReason}. Cancelled by: ${cancelledBy}`,
          type: 'booking_cancelled',
          role: 'CUSTOMER',
          userId: booking.userId,
        }
      });
    }

    // Create notification for superadmin
    await prisma.notification.create({
      data: {
        message: `Booking #${bookingId} (Guest: ${booking.user?.name || booking.guestName}) was cancelled by ${cancelledBy}. Reason: ${cancellationReason}`,
        type: 'booking_cancelled',
        role: 'SUPERADMIN',
      }
    });

    // Create audit trail
    await prisma.auditTrail.create({
      data: {
        actorId: cancelledById,
        actorName: cancelledBy || 'Cashier',
        actorRole: role,
        action: 'CANCEL_CHECKOUT_TRANSACTION',
        entity: 'Booking',
        entityId: bookingId.toString(),
        details: JSON.stringify({
          bookingId: bookingId,
          guestName: booking.user?.name || booking.guestName,
          cancellationReason: cancellationReason,
          cancelledBy: cancelledBy,
          roomsFreed: booking.rooms.length,
          previousStatus: booking.status,
          previousPaymentStatus: booking.paymentStatus
        }),
      }
    });

    console.log(`✅ Booking ${bookingId} cancelled successfully`);

    return NextResponse.json({
      success: true,
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        paymentStatus: updatedBooking.paymentStatus,
      },
    });

  } catch (error) {
    console.error('❌ Transaction cancellation error:', error);
    return NextResponse.json({ 
      error: 'Failed to cancel transaction',
      details: error.message 
    }, { status: 500 });
  }
}
