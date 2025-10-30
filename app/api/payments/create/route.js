import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAudit } from '@/src/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

export async function POST(req) {
  try {
    const { bookingId, amount, paymentType, paymentMethod } = await req.json();

    if (!bookingId || !amount) {
      return NextResponse.json({ error: 'Missing bookingId or amount' }, { status: 400 });
    }

    // Enforce reservation-only flow
    if (paymentType && paymentType !== 'reservation') {
      return NextResponse.json({ error: 'Only reservation payments are allowed' }, { status: 400 });
    }

    // Load booking to compute reservation fee = 2000 * totalRooms
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      include: { rooms: true }
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if booking has expired
    const now = new Date();
    if (
      booking.heldUntil && booking.heldUntil < now &&
      (booking.status === 'Pending' || booking.status === 'Held') &&
      booking.paymentStatus !== 'Reservation' && booking.paymentStatus !== 'Paid'
    ) {
      // Auto-cancel the expired booking
      await prisma.booking.update({
        where: { id: parseInt(bookingId) },
        data: {
          status: 'Cancelled',
          heldUntil: null,
        },
      });
      return NextResponse.json({ 
        error: 'This booking has expired. Please create a new booking.' 
      }, { status: 400 });
    }

    // Check if booking is in a valid state for payment
    if (booking.status === 'Cancelled') {
      return NextResponse.json({ error: 'Cannot pay for a cancelled booking' }, { status: 400 });
    }
    if (booking.status === 'Confirmed' && booking.paymentStatus === 'Paid') {
      return NextResponse.json({ error: 'This booking has already been paid' }, { status: 400 });
    }

    const totalRooms = (booking.rooms || []).reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const expectedAmount = totalRooms * 2000; // in pesos
    if (Math.round(Number(amount)) !== Math.round(expectedAmount)) {
      return NextResponse.json({ error: `Invalid amount. Expected ₱${expectedAmount}` }, { status: 400 });
    }

    // Cancel any pending payments for this booking before creating a new one
    // This prevents duplicate payments when user switches payment methods
    const pendingPayments = await prisma.payment.findMany({
      where: {
        bookingId: parseInt(bookingId),
        status: 'Pending'
      }
    });

    if (pendingPayments.length > 0) {
      await prisma.payment.updateMany({
        where: {
          bookingId: parseInt(bookingId),
          status: 'Pending'
        },
        data: {
          status: 'Cancelled'
        }
      });
      console.log(`Cancelled ${pendingPayments.length} pending payment(s) for booking ${bookingId}`);
    }

    // Convert to centavos (PayMongo requires this)
    const amountInCents = Math.round(amount * 100);

    // Create a Source for GCash/PayMaya in PayMongo
    const pmType = paymentMethod === 'gcash' ? 'gcash' : 'grab_pay';
    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'PAYMONGO_SECRET_KEY is not configured' }, { status: 500 });
    }
    const basicAuth = Buffer.from(`${secretKey}:`).toString('base64');
    const sourceRes = await fetch('https://api.paymongo.com/v1/sources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
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
            type: pmType,
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
    const payment = await prisma.payment.create({
      data: {
        bookingId: parseInt(bookingId),
        amount: amountInCents,
        status: 'Pending',
        provider: 'paymongo',
        referenceId: source.id,
        method: paymentMethod,
      },
    });

    // Record audit for payment creation
    try {
      const session = await getServerSession(authOptions);
      const booking = await prisma.booking.findUnique({ where: { id: parseInt(bookingId) } });
      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || session?.user?.email || 'System',
        actorRole: session?.user?.role || 'SYSTEM',
        action: 'CREATE',
        entity: 'Payment',
        entityId: String(payment.id),
        details: JSON.stringify({
          summary: `Created payment for booking ${booking?.guestName || bookingId}`,
          after: {
            id: Number(payment.id),
            bookingId: Number(payment.bookingId),
            amount: Number(payment.amount),
            status: payment.status,
            provider: payment.provider,
            method: paymentMethod,
            referenceId: payment.referenceId
          }
        }),
      });
    } catch (auditErr) {
      console.error('Failed to record audit for payment creation:', auditErr);
    }

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
