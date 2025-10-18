import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// This endpoint is for testing purposes in local development
// when webhooks don't work on localhost
export async function POST(req) {
  try {
    const { bookingId, sourceId } = await req.json();

    if (!bookingId || !sourceId) {
      return NextResponse.json({ error: 'Missing bookingId or sourceId' }, { status: 400 });
    }

    console.log(`🔄 Manual completion attempt for booking ${bookingId}, source ${sourceId}`);

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: { 
        bookingId: parseInt(bookingId),
        referenceId: sourceId 
      },
      include: { booking: true },
    });

    if (!payment) {
      console.log(`❌ Payment not found for booking ${bookingId}, source ${sourceId}`);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    console.log(`💳 Found payment ${payment.id} with status: ${payment.status}`);

    // Check payment status with PayMongo
    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    const basicAuth = Buffer.from(`${secretKey}:`).toString('base64');
    
    try {
      console.log(`🔍 Checking source status with PayMongo...`);
      const sourceRes = await fetch(`https://api.paymongo.com/v1/sources/${sourceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${basicAuth}`
        }
      });

      const sourceData = await sourceRes.json();
      console.log(`📊 Source status:`, sourceData.data?.attributes?.status);
      
      if (sourceData.data && sourceData.data.attributes.status === 'chargeable') {
        console.log(`✅ Source is chargeable, creating payment...`);
        
        // Create a payment using the source
        const chargeRes = await fetch('https://api.paymongo.com/v1/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${basicAuth}`
          },
          body: JSON.stringify({
            data: {
              attributes: {
                amount: Number(payment.amount),
                source: { id: sourceId, type: 'source' },
                currency: 'PHP',
                description: `Payment for Booking #${payment.bookingId}`,
              }
            }
          })
        });

        const chargeData = await chargeRes.json();
        console.log(`💰 Charge result:`, chargeData.data ? 'Success' : 'Failed');
        
        if (chargeRes.ok && chargeData.data) {
          console.log(`🎉 Payment successful, updating database...`);
          
          // Update payment to Paid
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'Paid' },
          });

          // Update booking
          await prisma.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: 'Pending',
              paymentStatus: 'Reservation',
              heldUntil: null,
            },
          });

          // Reset user cooldown
          if (payment.booking?.userId) {
            await prisma.user.update({
              where: { id: payment.booking.userId },
              data: { failedPaymentAttempts: 0, paymentCooldownUntil: null },
            });
          }

          console.log(`✅ Payment completed successfully for booking ${bookingId}`);
          return NextResponse.json({ 
            success: true, 
            message: 'Payment completed successfully',
            paymentStatus: 'Paid'
          });
        } else {
          console.log(`❌ Charge failed:`, chargeData);
        }
      } else {
        console.log(`⏳ Source not ready, status: ${sourceData.data?.attributes?.status}`);
      }
    } catch (paymongoError) {
      console.error('PayMongo API Error:', paymongoError);
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Payment not ready or failed',
      paymentStatus: payment.status
    });

  } catch (error) {
    console.error('Manual Payment Completion Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}