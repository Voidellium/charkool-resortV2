import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Development only: API to simulate a test payment method and mark booking as paid
// TODO: Remove this endpoint before production deployment

export async function POST(req) {
  try {
    const { bookingId, amount, status, method } = await req.json();

    if (!bookingId || !amount || !status || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create a payment record with status 'paid' and method 'TEST'
    const payment = await prisma.payment.create({
      data: {
        bookingId: parseInt(bookingId),
        amount: Math.round(amount * 100), // store in cents
        status,
        provider: method,
        referenceId: `test_${Date.now()}`,
      },
    });

    // Optionally, update booking status to paid or confirmed here if needed

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error('Test Payment Error:', error);
    return NextResponse.json({ error: 'Server error processing test payment' }, { status: 500 });
  }
}
