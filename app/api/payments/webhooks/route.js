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
    if (eventType === 'source.chargeable') {
      const sourceId = body.data.id;
      
      // Find the payment record using the source ID
      const payment = await prisma.payment.findUnique({
        where: { referenceId: sourceId },
        include: { booking: true },
      });

      if (!payment) {
        console.error('❌ Payment record not found for source:', sourceId);
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      // Create a payment using the source
      const chargeRes = await fetch('https://api.paymongo.com/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY).toString('base64')}`
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: payment.amount,
              source: { id: sourceId },
              currency: 'PHP',
              description: `Payment for Booking #${payment.bookingId}`,
            }
          }
        })
      });

      const chargeData = await chargeRes.json();
      
      if (!chargeRes.ok) {
        console.error('❌ Failed to create charge:', chargeData);
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'failed' },
        });
        return NextResponse.json({ error: 'Failed to create charge' }, { status: 500 });
      }

    } else if (eventType === 'payment.paid') {
      const paymentId = body.data.id;
      const payment = await prisma.payment.findFirst({
        where: { 
          OR: [
            { referenceId: paymentId },
            { referenceId: body.data.attributes.source?.id }
          ]
        },
        include: { booking: true },
      });

      if (!payment) {
        console.error('❌ Payment record not found in database:', paymentId);
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      // ✅ Idempotency check: only update if the status is not already 'paid'
      if (payment.status !== 'paid') {
        // Get booking details to check payment type
        const booking = await prisma.booking.findUnique({
          where: { id: payment.bookingId },
          select: { totalAmount: true, paymentType: true }
        });

        let paymentStatus = 'paid';
        let bookingStatus = 'Confirmed';
        let bookingPaymentStatus = 'Paid';

        // Set status based on payment type
        if (booking.paymentType === 'reservation' || booking.paymentType === 'half') {
          paymentStatus = 'pending';
          bookingPaymentStatus = 'Pending';
          bookingStatus = booking.paymentType === 'half' ? 'Confirmed' : 'Pending';
        }

        // Update payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: paymentStatus },
        });

        // Update booking status
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            status: bookingStatus,
            paymentStatus: bookingPaymentStatus,
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