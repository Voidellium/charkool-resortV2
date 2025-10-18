import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAudit } from '@/src/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

export async function POST(req) {
  try {
    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 });
    }

    // Find the payment record
    const payment = await prisma.payment.findUnique({
      where: { referenceId: paymentIntentId },
      include: { booking: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Update payment status to paid
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'Paid' },
    });

    // Update booking status to CONFIRMED and clear heldUntil
    const updatedBooking = await prisma.booking.update({
      where: { id: payment.bookingId },
      data: {
        status: 'Confirmed',
        paymentStatus: 'Paid',
        heldUntil: null,
      },
    });

    // Record audit for payment confirmation
    try {
      const session = await getServerSession(authOptions);
      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || session?.user?.email || 'System',
        actorRole: session?.user?.role || 'SYSTEM',
        action: 'UPDATE',
        entity: 'Payment',
        entityId: String(payment.id),
        details: JSON.stringify({
          summary: `Confirmed payment for booking ${payment.booking?.guestName || payment.bookingId}`,
          before: { status: payment.status },
          after: { 
            status: updatedPayment.status,
            bookingStatus: updatedBooking.status,
            paymentStatus: updatedBooking.paymentStatus
          }
        }),
      });
    } catch (auditErr) {
      console.error('Failed to record audit for payment confirmation:', auditErr);
    }

    return NextResponse.json({ success: true, message: 'Payment confirmed and booking updated' });
  } catch (error) {
    console.error('Payment Confirm Error:', error);
    return NextResponse.json({ error: 'Server error confirming payment' }, { status: 500 });
  }
}
