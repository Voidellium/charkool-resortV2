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

    // Create a Source for GCash/PayMaya in PayMongo
    const paymentType = req.body.paymentMethod === 'gcash' ? 'gcash' : 'grab_pay';
    const sourceRes = await fetch('https://api.paymongo.com/v1/sources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY).toString('base64')}`
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountInCents,
            currency: 'PHP',
            redirect: {
              success: `${process.env.NEXTAUTH_URL}/api/payments/redirect?status=success&bookingId=${bookingId}`,
              failed: `${process.env.NEXTAUTH_URL}/api/payments/redirect?status=failed&bookingId=${bookingId}`,
            },
            type: paymentType,
            description: `Booking #${bookingId}`,
          }
        }
      })
    });

    const sourceData = await sourceRes.json();

    console.log('PayMongo Source response:', JSON.stringify(sourceData, null, 2));

    if (!sourceRes.ok) {
      console.error('❌ PayMongo Error:', sourceData);
      return NextResponse.json({ error: 'Failed to create payment source', details: sourceData }, { status: 500 });
    }

    const source = sourceData.data;

    // Save Payment record in Prisma
    await prisma.payment.create({
      data: {
        bookingId: parseInt(bookingId),
        amount: amountInCents,
        status: 'Pending',
        provider: 'paymongo',
        referenceId: source.id,
        method: req.body.paymentMethod,
      },
    });

    // The checkout_url is where the user needs to be redirected to complete the payment
    const redirectUrl = source.attributes.redirect.checkout_url;

    if (!redirectUrl) {
      return NextResponse.json({ error: 'No checkout URL received from payment provider' }, { status: 500 });
    }

    return NextResponse.json({
      sourceId: source.id,
      redirectUrl,
    });
  } catch (error) {
    console.error('Payment Create Error:', error);
    return NextResponse.json({ error: 'Server error creating payment' }, { status: 500 });
  }
}
