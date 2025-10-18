import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        bookingId: parseInt(bookingId),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: payment.status.toLowerCase(),
      paymentId: Number(payment.id),
      amount: Number(payment.amount),
      provider: payment.provider,
    });

  } catch (error) {
    console.error('Payment Status Check Error:', error);
    return NextResponse.json({ error: 'Server error checking payment status' }, { status: 500 });
  }
}