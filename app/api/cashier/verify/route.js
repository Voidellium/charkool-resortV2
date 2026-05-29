import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { recordAudit } from '@/src/lib/audit';
import { triggerEvent, notifyStaff, CHANNELS, EVENTS } from '@/lib/pusher-server';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!role || (role !== 'CASHIER' && role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { paymentId, note } = await req.json();
    if (!paymentId) return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 });

    // Ensure paymentId is a string (Prisma Payment.id is String type)
    const paymentIdStr = String(paymentId);

    const payment = await prisma.payment.findUnique({ where: { id: paymentIdStr }, include: { booking: true } });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const updated = await prisma.payment.update({
      where: { id: paymentIdStr },
      data: {
        verificationStatus: 'Verified',
        verifiedById: session?.user?.id || null,
        verifiedAt: new Date(),
      }
    });

    // optional remark
    if (note) {
      await prisma.bookingRemark.create({
        data: {
          bookingId: payment.bookingId,
          authorId: session?.user?.id || null,
          authorRole: role,
          content: note,
        }
      });
    }

    // Cashier confirmation rule: once payment is verified and reservation threshold is met,
    // the booking may be moved to Confirmed from Pending/Held.
    const bookingForDecision = await prisma.booking.findUnique({
      where: { id: payment.bookingId },
      include: { payments: true, rooms: true },
    });

    if (bookingForDecision) {
      const totalPaid = (bookingForDecision.payments || []).reduce((sum, p) => {
        if (p.id === paymentIdStr) return sum + Number(updated.amount || 0);
        return sum + Number(p.amount || 0);
      }, 0);

      const roomCount = (bookingForDecision.rooms || []).reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
      const reservationThreshold = roomCount * 2000 * 100;

      let nextPaymentStatus = bookingForDecision.paymentStatus;
      if (totalPaid >= Number(bookingForDecision.totalPrice || 0)) {
        nextPaymentStatus = 'Paid';
      } else if (totalPaid >= reservationThreshold) {
        nextPaymentStatus = 'Reservation';
      }

      const canConfirm = totalPaid >= reservationThreshold;
      const nextBookingStatus = canConfirm && ['Pending', 'Held'].includes(bookingForDecision.status)
        ? 'Confirmed'
        : bookingForDecision.status;

      if (nextPaymentStatus !== bookingForDecision.paymentStatus || nextBookingStatus !== bookingForDecision.status) {
        await prisma.booking.update({
          where: { id: bookingForDecision.id },
          data: {
            paymentStatus: nextPaymentStatus,
            status: nextBookingStatus,
          },
        });
      }
    }

    // notifications: receptionist + superadmin
    await prisma.notification.create({
      data: { message: `Payment verified for Booking #${payment.bookingId}`, type: 'PAYMENT_VERIFIED', role: 'RECEPTIONIST', bookingId: payment.bookingId }
    });
    await prisma.notification.create({
      data: { message: `Payment verified for Booking #${payment.bookingId}`, type: 'PAYMENT_VERIFIED', role: 'SUPERADMIN', bookingId: payment.bookingId }
    });

    await recordAudit({
      actorId: session?.user?.id || null,
      actorName: session?.user?.name || session?.user?.email || 'System',
      actorRole: role,
      action: 'VERIFY',
      entity: 'Payment',
      entityId: String(paymentId),
      details: JSON.stringify({ paymentId, bookingId: payment.bookingId })
    });

    // Realtime updates for cashier/receptionist/superadmin dashboards.
    try {
      const pusherData = {
        bookingId: payment.bookingId,
        paymentId: updated.id,
        guestName: payment.booking?.guestName || 'Guest',
        verificationStatus: updated.verificationStatus,
      };
      await triggerEvent(CHANNELS.BOOKINGS, EVENTS.PAYMENT_VERIFIED, pusherData);
      await triggerEvent(CHANNELS.BOOKINGS, EVENTS.BOOKING_UPDATED, pusherData);
      await notifyStaff('RECEPTIONIST', { type: 'payment', message: `Payment verified for Booking #${payment.bookingId}`, ...pusherData });
      await notifyStaff('SUPERADMIN', { type: 'payment', message: `Payment verified for Booking #${payment.bookingId}`, ...pusherData });
    } catch (pusherErr) {
      console.warn('[Pusher] Failed to broadcast verify updates:', pusherErr);
    }

    return NextResponse.json({ success: true, payment: { id: updated.id, verificationStatus: updated.verificationStatus } });
  } catch (e) {
    console.error('Verify error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
