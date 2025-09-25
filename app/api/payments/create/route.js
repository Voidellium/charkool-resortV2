import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req) {
  try {
    const { bookingId, amount } = await req.json();

    if (!bookingId || !amount) {
      return NextResponse.json({ error: 'Missing bookingId or amount' }, { status: 400 });
    }

    // Convert to centavos (PayMongo requires this)
    const amountInCents = Math.round(amount * 100);

    // Create PaymentIntent in PayMongo
    const paymongoRes = await fetch('https://api.paymongo.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY).toString('base64')}`
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountInCents,
            payment_method_allowed: ['gcash', 'paymaya', 'card'],
            currency: 'PHP',
            description: `Booking #${bookingId}`,
            metadata: {
              bookingId: bookingId.toString()
            },
            // Add success and cancel URLs to redirect user after payment
            success_url: `${process.env.NEXTAUTH_URL}/confirmation?bookingId=${bookingId}`,
            cancel_url: `${process.env.NEXTAUTH_URL}/booking`
          }
        }
      })
    });

    const paymongoData = await paymongoRes.json();

    console.log('PayMongo response:', JSON.stringify(paymongoData, null, 2));

    if (!paymongoRes.ok) {
      console.error('❌ PayMongo Error:', paymongoData);
      return NextResponse.json({ error: 'Failed to create PaymentIntent', details: paymongoData }, { status: 500 });
    }

    const paymentIntent = paymongoData.data;

    // Save Payment record in Prisma
    await prisma.payment.create({
      data: {
        bookingId: parseInt(bookingId),
        amount: amountInCents,
        status: 'Pending',
        provider: 'paymongo',
        referenceId: paymentIntent.id,
      },
    });

    // Return the redirect URL from PayMongo's next_action or fallback to null
    const redirectUrl = paymentIntent.attributes.next_action?.redirect?.url || null;

    return NextResponse.json({
      clientKey: paymentIntent.attributes.client_key,
      paymentIntentId: paymentIntent.id,
      redirectUrl,
    });
  } catch (error) {
    console.error('Payment Create Error:', error);
    return NextResponse.json({ error: 'Server error creating payment' }, { status: 500 });
  }
}
