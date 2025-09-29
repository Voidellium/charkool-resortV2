import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET booking by ID
export const GET = async (_, context) => {
  try {
    const { id } = await context.params;
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        rooms: { include: { room: true } },
        user: true,
        amenities: { include: { amenity: true } },
        optionalAmenities: { include: { optionalAmenity: true } },
        rentalAmenities: { include: { rentalAmenity: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('❌ Booking GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// PUT update booking
export const PUT = async (req, context) => {
  try {
    const { id } = await context.params;
    const data = await req.json();

    const updateData = {};

    if (data.guestName !== undefined) updateData.guestName = data.guestName;
    if (data.checkIn !== undefined) {
      const checkInDate = new Date(data.checkIn);
      if (isNaN(checkInDate.getTime())) {
        return NextResponse.json({ error: 'Invalid checkIn date' }, { status: 400 });
      }
      updateData.checkIn = checkInDate;
    }
    if (data.checkOut !== undefined) {
      const checkOutDate = new Date(data.checkOut);
      if (isNaN(checkOutDate.getTime())) {
        return NextResponse.json({ error: 'Invalid checkOut date' }, { status: 400 });
      }
      updateData.checkOut = checkOutDate;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
    if (data.totalPrice !== undefined) updateData.totalPrice = data.totalPrice;



    // User is optional, only update if provided
    if (data.userId !== undefined) {
      updateData.userId = data.userId;
    }

    if (data.amenityIds !== undefined) {
      const amenityUpdates = {
        // Delete all existing amenities for this booking
        deleteMany: {},
        // Create new ones based on the provided IDs
        create: data.amenityIds.map((amenityId) => ({ amenityInventoryId: amenityId })),
      };
      updateData.amenities = amenityUpdates;
    }

    // Handle cancellation logic
    if (data.status === 'Cancelled') {
      const booking = await prisma.booking.findUnique({
        where: { id: parseInt(id) },
        include: { payments: true },
      });

      if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }

      // Check if already checked in (prevent cancellation)
      const now = new Date();
      if (booking.checkIn <= now) {
        return NextResponse.json({ error: 'Cannot cancel booking that has already checked in' }, { status: 400 });
      }

      // Find paid payments
      const paidPayments = booking.payments.filter(p => p.status === 'paid');

      if (paidPayments.length > 0) {
        // Process refunds for paid payments
        for (const payment of paidPayments) {
          try {
            if (payment.provider === 'test') {
              // For TEST payments, directly set to refunded
              await prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'Refunded' },
              });
            } else {
              // For real payments, call refund API
              const refundRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/payments/refund`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId: payment.id, reason: 'booking_cancelled' }),
              });

              if (!refundRes.ok) {
                console.error('Refund failed for payment:', payment.id);
                // Continue with other payments, but mark this one as failed
                await prisma.payment.update({
                  where: { id: payment.id },
                  data: { status: 'Failed' },
                });
              }
            }
          } catch (error) {
            console.error('Error processing refund for payment:', payment.id, error);
          }
        }
      }

      // Send notifications
      try {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Booking #${id} for ${booking.guestName} has been cancelled.`,
            type: 'booking_cancelled',
            role: 'RECEPTIONIST',
          }),
        });

        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Booking #${id} for ${booking.guestName} has been cancelled.`,
            type: 'booking_cancelled',
            role: 'SUPERADMIN',
          }),
        });
      } catch (error) {
        console.error('Error sending cancellation notifications:', error);
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { amenities: { include: { amenity: true } } },
    });

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('❌ Booking PUT Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// DELETE booking
export const DELETE = async (_, context) => {
  try {
    const { id } = await context.params;
    
    // First, delete all associated booking amenities
    await prisma.bookingAmenity.deleteMany({
      where: { bookingId: parseInt(id) },
    });

    // Then, delete the booking itself
    await prisma.booking.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Booking and associated amenities deleted' });
  } catch (error) {
    console.error('❌ Booking DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};