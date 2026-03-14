import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

/**
 * PUT /api/bookings/[id]/dismiss
 * Dismiss (hide) an expired pending booking from guest view
 * Only works for bookings with status 'Expired' and owned by the current user
 */
export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = parseInt(params.id);
    
    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify ownership
    if (booking.userId !== session.user.id) {
      return NextResponse.json({ error: 'You can only dismiss your own bookings' }, { status: 403 });
    }

    // Only allow dismissing expired bookings
    if (booking.status !== 'Expired') {
      return NextResponse.json({ 
        error: 'Only expired bookings can be dismissed' 
      }, { status: 400 });
    }

    // Soft delete by setting isDeleted flag
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        isDeleted: true,
        cancellationRemarks: booking.cancellationRemarks 
          ? `${booking.cancellationRemarks} (Dismissed by guest)`
          : 'Dismissed by guest',
      },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Booking dismissed successfully',
      booking: updatedBooking 
    });
    
  } catch (error) {
    console.error('Dismiss Booking Error:', error);
    return NextResponse.json({ 
      error: 'Failed to dismiss booking' 
    }, { status: 500 });
  }
}
