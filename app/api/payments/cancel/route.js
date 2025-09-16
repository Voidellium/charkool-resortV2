import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req) {
  try {
    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 });
    }

    // Find the payment record
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Update payment status to cancelled
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'cancelled' },
    });

    // Update booking status to CANCELLED and clear heldUntil
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'CANCELLED',
        heldUntil: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Payment cancelled and booking updated' });
  } catch (error) {
    console.error('Payment Cancel Error:', error);
    return NextResponse.json({ error: 'Server error cancelling payment' }, { status: 500 });
  }
}
