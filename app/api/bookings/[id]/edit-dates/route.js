import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH: Update booking dates (Super Admin only)
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    // Authorization check - only SUPERADMIN can edit booking dates directly
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Only Super Admin can edit booking dates.' },
        { status: 403 }
      );
    }

    // Await params in Next.js 15
    const { id } = await params;
    const bookingId = parseInt(id);

    if (isNaN(bookingId)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { newCheckIn, newCheckOut, reason } = body;

    // Validation
    if (!newCheckIn || !newCheckOut) {
      return NextResponse.json(
        { error: 'Both check-in and check-out dates are required' },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Reason for date change is required' },
        { status: 400 }
      );
    }

    const checkInDate = new Date(newCheckIn + 'T00:00:00');
    const checkOutDate = new Date(newCheckOut + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate >= checkOutDate) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }

    if (checkInDate < today) {
      return NextResponse.json(
        { error: 'Check-in date cannot be in the past' },
        { status: 400 }
      );
    }

    // Get existing booking
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Format dates for audit trail
    const oldCheckIn = new Date(existingBooking.checkIn).toLocaleDateString();
    const oldCheckOut = new Date(existingBooking.checkOut).toLocaleDateString();
    const newCheckInFormatted = checkInDate.toLocaleDateString();
    const newCheckOutFormatted = checkOutDate.toLocaleDateString();

    // Update booking dates
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        checkIn: checkInDate,
        checkOut: checkOutDate,
      },
      include: {
        rooms: {
          include: {
            room: true,
          },
        },
      },
    });

    // Create audit trail
    await prisma.auditTrail.create({
      data: {
        actorId: session.user.id,
        actorName: `${session.user.firstName} ${session.user.lastName}`,
        actorRole: session.user.role,
        action: 'UPDATE',
        entity: 'Booking',
        entityId: bookingId.toString(),
        details: `Modified booking dates - Old: ${oldCheckIn} to ${oldCheckOut} | New: ${newCheckInFormatted} to ${newCheckOutFormatted} | Reason: ${reason}`,
      },
    });

    // Create a booking remark for this change
    await prisma.bookingRemark.create({
      data: {
        bookingId: bookingId,
        authorId: session.user.id,
        authorRole: session.user.role,
        content: `Booking dates updated by Super Admin. Reason: ${reason}`,
      },
    });

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: 'Booking dates updated successfully',
    });
  } catch (error) {
    console.error('Error updating booking dates:', error);
    return NextResponse.json(
      { error: 'Failed to update booking dates', details: error.message },
      { status: 500 }
    );
  }
}
