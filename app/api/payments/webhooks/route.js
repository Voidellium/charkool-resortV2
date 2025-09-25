import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export async function POST(req) {
  try {
    // Read the raw body and the PayMongo signature from the headers
    const rawBody = await req.text();
    const paymongoSignature = req.headers.get('Paymongo-Signature');

    // ✅ IMPORTANT: Verify the webhook signature
    // This protects your endpoint from malicious requests
    const secretKey = process.env.PAYMONGO_WEBHOOK_SECRET;
    const [timestamp, signature] = paymongoSignature.split(',').map(part => part.split('=')[1]);
    const hashedPayload = crypto.createHmac('sha256', secretKey).update(`${timestamp}.${rawBody}`).digest('hex');
    
    if (hashedPayload !== signature) {
      console.error('❌ Webhook signature verification failed');
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }

    // Parse the body as JSON after verification
    const body = JSON.parse(rawBody);
    const eventType = body.data.attributes.type;

    // Check for the specific event you want to handle
    if (eventType === 'payment.paid') {
      const paymentIntentId = body.data.attributes.data.id;
      const metadata = body.data.attributes.data.attributes.metadata;
      const bookingId = metadata.bookingId;

      if (!paymentIntentId || !bookingId) {
        console.error('❌ Missing paymentIntentId or bookingId in webhook data');
        return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
      }

      // Find the payment record in your database using the referenceId
      const payment = await prisma.payment.findUnique({
        where: { referenceId: paymentIntentId },
        include: { booking: true },
      });

      if (!payment) {
        console.error('❌ Payment record not found in database:', paymentIntentId);
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      // ✅ Idempotency check: only update if the status is not already 'paid'
      if (payment.status !== 'paid') {
        // Update payment status to paid
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'paid' },
        });

        // Update booking status to CONFIRMED
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            status: 'Confirmed',
            paymentStatus: 'Paid',
            heldUntil: null,
          },
        });

        console.log(`✅ Payment and booking confirmed for PaymentIntent: ${paymentIntentId}`);
      } else {
        console.log(`ℹ️ Payment already confirmed, skipping update for: ${paymentIntentId}`);
      }
    }

    // Respond with a 200 OK to acknowledge receipt of the event
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    return NextResponse.json({ error: 'Server error processing webhook' }, { status: 500 });
  }
}