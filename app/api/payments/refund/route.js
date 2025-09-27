import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req) {
  try {
    const { paymentId, reason } = await req.json();

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

    if (payment.status !== 'paid') {
      return NextResponse.json({ error: 'Only paid payments can be refunded' }, { status: 400 });
    }

    // Handle TEST payments differently
    if (payment.provider === 'test') {
      // For TEST payments, directly mark as refunded
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'refunded' },
      });
    } else {
      // Refund via PayMongo for real payments
      const paymongoRes = await fetch(`https://api.paymongo.com/v1/payment_intents/${payment.referenceId}/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY).toString('base64')}`
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: payment.amount,
              reason: reason || 'requested_by_customer',
              metadata: {
                paymentId: payment.id,
              },
            },
          },
        }),
      });

      const paymongoData = await paymongoRes.json();

      if (!paymongoRes.ok) {
        console.error('PayMongo Refund Error:', paymongoData);
        // Update to failed instead of throwing error
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'failed' },
        });
        return NextResponse.json({ error: 'Failed to process refund', details: paymongoData }, { status: 500 });
      }

      // Update payment status to refunded
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'refunded' },
      });
    }

    // Optionally update booking status
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: {
        paymentStatus: 'REFUNDED',
        status: 'CANCELLED', // or keep as is
      },
    });

    return NextResponse.json({ success: true, message: 'Refund processed successfully' });
  } catch (error) {
    console.error('Refund Error:', error);
    return NextResponse.json({ error: 'Server error processing refund' }, { status: 500 });
  }
}
