import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req) {
  try {
    const body = await req.json();

    const eventType = body.data.attributes.type;
    const paymentData = body.data.attributes.data;

    if (eventType === 'payment.paid') {
      const paymongoId = paymentData.id;

      // ✅ Update Payment to 'paid'
      await prisma.payment.updateMany({
        where: { referenceId: paymongoId },
        data: { status: 'paid' }
      });

      console.log('Payment marked as paid:', paymongoId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
