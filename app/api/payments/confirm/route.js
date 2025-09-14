import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'paid' },
    });

    // Update booking status to CONFIRMED and clear heldUntil
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        heldUntil: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Payment confirmed and booking updated' });
  } catch (error) {
    console.error('Payment Confirm Error:', error);
    return NextResponse.json({ error: 'Server error confirming payment' }, { status: 500 });
  }
}
