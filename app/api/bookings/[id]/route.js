import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAudit } from '@/src/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

// Function to serialize BigInt values for JSON response
function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

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

    return NextResponse.json(serializeBigInt(booking));
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
    if (data.cancellationRemarks !== undefined) updateData.cancellationRemarks = data.cancellationRemarks;



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

      // Check if cancellation remarks provided
      if (!data.cancellationRemarks || data.cancellationRemarks.trim() === '') {
        return NextResponse.json({ error: 'Cancellation remarks are required' }, { status: 400 });
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
        const checkInMonth = new Date(booking.checkIn).toLocaleString('default', { month: 'long' });
        const checkOutMonth = new Date(booking.checkOut).toLocaleString('default', { month: 'long' });
        const checkInDay = new Date(booking.checkIn).getDate();
        const checkOutDay = new Date(booking.checkOut).getDate();
        const message = `The booking from ${checkInMonth} ${checkInDay} to ${checkOutMonth} ${checkOutDay} was cancelled.`;

        await prisma.notification.create({
          data: {
            message,
            type: 'booking_cancelled',
            role: 'RECEPTIONIST',
            bookingId: parseInt(id),
          },
        });

        await prisma.notification.create({
          data: {
            message,
            type: 'booking_cancelled',
            role: 'SUPERADMIN',
            bookingId: parseInt(id),
          },
        });

        // Send to customer if userId exists
        if (booking.userId) {
          const messageWithRemarks = `${message} Remarks: ${data.cancellationRemarks || 'No remarks provided.'}`;
          await prisma.notification.create({
            data: {
              message: messageWithRemarks,
              type: 'booking_cancelled',
              role: 'CUSTOMER',
              bookingId: parseInt(id),
              userId: booking.userId,
            },
          });
        }
      } catch (error) {
        console.error('Error sending cancellation notifications:', error);
      }
    }

    // Fetch existing booking before update so we can produce a human-friendly diff
    const prevBooking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        rooms: { include: { room: true } },
        optionalAmenities: { include: { optionalAmenity: true } },
        rentalAmenities: { include: { rentalAmenity: true } },
        cottage: { include: { cottage: true } },
        amenities: { include: { amenity: true } },
        payments: true,
        user: true,
      },
    });

    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { amenities: { include: { amenity: true } } },
    });

    // Re-fetch the full updated booking to compare related lists (rooms, amenities, etc.)
    const updatedBookingFull = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        rooms: { include: { room: true } },
        optionalAmenities: { include: { optionalAmenity: true } },
        rentalAmenities: { include: { rentalAmenity: true } },
        cottage: { include: { cottage: true } },
        amenities: { include: { amenity: true } },
        payments: true,
        user: true,
      },
    });

    // Create notifications for superadmin based on changes
    try {
      if (data.status && data.status !== 'Cancelled') { // Cancelled already handled above
        await prisma.notification.create({
          data: {
            message: `Booking from ${new Date(updatedBooking.checkIn).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })} to ${new Date(updatedBooking.checkOut).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })} status updated to ${data.status} for ${updatedBooking.guestName}`,
            type: 'booking_status_updated',
            role: 'superadmin',
          },
        });

        // Notify customer if status is Confirmed and userId exists
        if (data.status === 'Confirmed' && updatedBooking.userId) {
          const checkInStr = new Date(updatedBooking.checkIn).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' });
          const checkOutStr = new Date(updatedBooking.checkOut).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' });
          const message = `Your booking from ${checkInStr} to ${checkOutStr} has been confirmed.`;

          await prisma.notification.create({
            data: {
              message,
              type: 'booking_confirmed',
              role: 'CUSTOMER',
              bookingId: parseInt(id),
              userId: updatedBooking.userId,
            },
          });
        }
      }
      if (data.checkIn || data.checkOut) {
        const checkInStr = data.checkIn ? new Date(data.checkIn).toLocaleDateString() : new Date(updatedBooking.checkIn).toLocaleDateString();
        const checkOutStr = data.checkOut ? new Date(data.checkOut).toLocaleDateString() : new Date(updatedBooking.checkOut).toLocaleDateString();
        await prisma.notification.create({
          data: {
            message: `Booking #${id} dates updated: ${checkInStr} to ${checkOutStr} for ${updatedBooking.guestName}`,
            type: 'booking_dates_updated',
            role: 'superadmin',
          },
        });
      }
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    // Record audit trail for booking update with a human-friendly summary
    try {
      const session = await getServerSession(authOptions);
      const changes = [];

      const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';
      const fmtMoney = (cents) => `₱${(Number(cents || 0) / 100).toFixed(2)}`;

      if (prevBooking) {
        if (prevBooking.guestName !== updatedBookingFull?.guestName) {
          changes.push(`Guest: "${prevBooking.guestName}" → "${updatedBookingFull?.guestName}"`);
        }
        if (String(prevBooking.userId || '') !== String(updatedBookingFull?.userId || '')) {
          changes.push(`Assigned user: ${prevBooking.userId || 'none'} → ${updatedBookingFull?.userId || 'none'}`);
        }
        if (prevBooking.status !== updatedBookingFull?.status) {
          changes.push(`Status: ${prevBooking.status} → ${updatedBookingFull?.status}`);
        }
        if (prevBooking.paymentStatus !== updatedBookingFull?.paymentStatus) {
          changes.push(`Payment status: ${prevBooking.paymentStatus} → ${updatedBookingFull?.paymentStatus}`);
        }
        if (String(prevBooking.checkIn) !== String(updatedBookingFull?.checkIn) || String(prevBooking.checkOut) !== String(updatedBookingFull?.checkOut)) {
          changes.push(`Dates: ${fmtDate(prevBooking.checkIn)} → ${fmtDate(updatedBookingFull?.checkIn)} to ${fmtDate(prevBooking.checkOut)} → ${fmtDate(updatedBookingFull?.checkOut)}`);
        }
        if (Number(prevBooking.totalPrice || 0) !== Number(updatedBookingFull?.totalPrice || 0)) {
          changes.push(`Total: ${fmtMoney(prevBooking.totalPrice)} → ${fmtMoney(updatedBookingFull?.totalPrice)}`);
        }

        // Compare rooms (by roomId)
        const prevRooms = (prevBooking.rooms || []).reduce((acc, r) => { acc[r.roomId] = r.quantity; return acc; }, {});
        const newRooms = (updatedBookingFull?.rooms || []).reduce((acc, r) => { acc[r.roomId] = r.quantity; return acc; }, {});
        const roomChanges = [];
        const roomIds = new Set([...Object.keys(prevRooms), ...Object.keys(newRooms)]);
        roomIds.forEach((rid) => {
          const prevQty = prevRooms[rid] || 0;
          const newQty = newRooms[rid] || 0;
          if (prevQty !== newQty) {
            const roomNamePrev = (prevBooking.rooms || []).find(r=>String(r.roomId)===String(rid))?.room?.name;
            const roomNameNew = (updatedBookingFull?.rooms || []).find(r=>String(r.roomId)===String(rid))?.room?.name;
            const name = roomNameNew || roomNamePrev || `Room ${rid}`;
            roomChanges.push(`${name}: ${prevQty} → ${newQty}`);
          }
        });
        if (roomChanges.length > 0) changes.push(`Rooms: ${roomChanges.join(', ')}`);

        if (data.cancellationRemarks) {
          changes.push(`Remarks: ${data.cancellationRemarks}`);
        }
      } else {
        // Fallback: prefer a small, meaningful whitelist rather than dumping all internal fields
        const whitelist = ['guestName', 'checkIn', 'checkOut', 'status', 'paymentStatus', 'totalPrice', 'cancellationRemarks'];
        const changed = Object.keys(data || {}).filter(k => whitelist.includes(k));
        if (changed.length) {
          changes.push(`Updated: ${changed.map(k => `${k}`).join(', ')}`);
        } else {
          changes.push('Updated booking (details omitted)');
        }
      }

      const action = (data.status === 'Cancelled') ? 'CANCEL' : 'UPDATE';
      const details = changes.length ? changes.join('; ') : `Updated booking ${updatedBooking.id}`;

      // Prepare structured before/after details for the audit
      const detailsObj = {
        summary: changes.length ? changes.join('; ') : `Updated booking ${updatedBooking.id}`,
        before: prevBooking,
        after: updatedBookingFull,
      };

      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || session?.user?.email || 'Unknown',
        actorRole: session?.user?.role || 'UNKNOWN',
        action,
        entity: 'Booking',
        entityId: String(updatedBooking.id),
        details: JSON.stringify(detailsObj),
      });
    } catch (auditErr) {
      console.error('Failed to record audit for booking update:', auditErr);
    }

    return NextResponse.json(serializeBigInt(updatedBooking));
  } catch (error) {
    console.error('❌ Booking PUT Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// DELETE booking
export const DELETE = async (_, context) => {
  try {
    const { id } = await context.params;
    // Fetch booking for context (guestName etc.) before deletion
    const booking = await prisma.booking.findUnique({ where: { id: parseInt(id) } });

    // First, delete all associated booking amenities
    await prisma.bookingAmenity.deleteMany({ where: { bookingId: parseInt(id) } });

    // Then, delete the booking itself
    await prisma.booking.delete({ where: { id: parseInt(id) } });

    // Record audit for deletion
    try {
      const session = await getServerSession(authOptions);
      const detailsObj = {
        summary: `Deleted booking for ${booking?.guestName || 'Unknown guest'}`,
        before: booking,
      };
      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || session?.user?.email || 'Unknown',
        actorRole: session?.user?.role || 'UNKNOWN',
        action: 'DELETE',
        entity: 'Booking',
        entityId: String(id),
        details: JSON.stringify(detailsObj),
      });
    } catch (auditErr) {
      console.error('Failed to record audit for booking deletion:', auditErr);
    }

    return NextResponse.json({ message: 'Booking and associated amenities deleted' });
  } catch (error) {
    console.error('❌ Booking DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};