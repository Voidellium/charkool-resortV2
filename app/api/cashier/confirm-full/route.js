import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { recordAudit } from '@/src/lib/audit';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!role || (role !== 'CASHIER' && role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { bookingId, amountPaid, method, referenceNo } = await req.json();
    if (!bookingId || !amountPaid || !method) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const booking = await prisma.booking.findUnique({ where: { id: Number(bookingId) }, include: { payments: true } });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const amountInCents = Math.round(Number(amountPaid));

    // create a payment record for onsite
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: BigInt(amountInCents),
        status: 'Paid',
        provider: 'onsite',
        method,
        referenceId: referenceNo || null,
        verificationStatus: 'Verified',
        verifiedById: session?.user?.id || null,
        verifiedAt: new Date(),
      }
    });

    // update booking to confirmed if fully paid
    const totalOther = (booking.payments || []).reduce((s, p) => s + Number(p.amount), 0);
    const totalPaid = totalOther + amountInCents;
    const fullyPaid = totalPaid >= booking.totalPrice;

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: fullyPaid ? 'Confirmed' : 'Pending',
        paymentStatus: fullyPaid ? 'Paid' : 'Partial',
        heldUntil: fullyPaid ? null : booking.heldUntil,
      }
    });

    // notifications
    await prisma.notification.create({ data: { message: `Full payment ${fullyPaid ? 'confirmed' : 'recorded'} for Booking #${booking.id}`, type: 'PAYMENT_CONFIRMED', role: 'RECEPTIONIST', bookingId: booking.id } });
    await prisma.notification.create({ data: { message: `Full payment ${fullyPaid ? 'confirmed' : 'recorded'} for Booking #${booking.id}`, type: 'PAYMENT_CONFIRMED', role: 'SUPERADMIN', bookingId: booking.id } });

    await recordAudit({
      actorId: session?.user?.id || null,
      actorName: session?.user?.name || session?.user?.email || 'System',
      actorRole: role,
      action: 'CONFIRM_FULL_PAYMENT',
      entity: 'Booking',
      entityId: String(booking.id),
      details: JSON.stringify({ amountInCents, method, referenceNo, fullyPaid })
    });

    return NextResponse.json({ success: true, booking: { id: updatedBooking.id, status: updatedBooking.status, paymentStatus: updatedBooking.paymentStatus }, payment: { id: payment.id } });
  } catch (e) {
    console.error('Confirm full error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
