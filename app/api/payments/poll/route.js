import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req) {
  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    console.log(`🔄 Polling payment status for booking ${bookingId}`);

    // Find the latest payment for this booking
    const payment = await prisma.payment.findFirst({
      where: { 
        bookingId: parseInt(bookingId)
      },
      orderBy: { createdAt: 'desc' },
      include: { booking: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // If already paid, return success
    if (payment.status === 'Paid') {
      return NextResponse.json({ 
        success: true, 
        status: 'paid',
        message: 'Payment already completed'
      });
    }

    // Check with PayMongo API
    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    const basicAuth = Buffer.from(`${secretKey}:`).toString('base64');
    
    try {
      console.log(`🔍 Checking source ${payment.referenceId} with PayMongo...`);
      
      const sourceRes = await fetch(`https://api.paymongo.com/v1/sources/${payment.referenceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${basicAuth}`
        }
      });

      const sourceData = await sourceRes.json();
      const sourceStatus = sourceData.data?.attributes?.status;
      
      console.log(`📊 Source status: ${sourceStatus}`);
      
      if (sourceStatus === 'chargeable') {
        console.log(`✅ Source is chargeable, creating charge...`);
        
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
                source: { id: payment.referenceId, type: 'source' },
                currency: 'PHP',
                description: `Payment for Booking #${payment.bookingId}`,
              }
            }
          })
        });

        const chargeData = await chargeRes.json();
        
        if (chargeRes.ok && chargeData.data?.attributes?.status === 'paid') {
          console.log(`🎉 Payment successful! Updating database...`);
          
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

          return NextResponse.json({ 
            success: true, 
            status: 'paid',
            message: 'Payment completed successfully'
          });
        } else {
          console.log(`❌ Charge failed:`, chargeData);
          return NextResponse.json({ 
            success: false, 
            status: 'failed',
            message: 'Payment charge failed'
          });
        }
      } else if (sourceStatus === 'failed' || sourceStatus === 'cancelled') {
        console.log(`❌ Payment failed with status: ${sourceStatus}`);
        
        // Update payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'Failed' },
        });
        
        return NextResponse.json({ 
          success: false, 
          status: 'failed',
          message: `Payment ${sourceStatus}`
        });
      } else {
        // Still pending
        console.log(`⏳ Payment still pending, status: ${sourceStatus}`);
        return NextResponse.json({ 
          success: false, 
          status: 'pending',
          message: 'Payment still processing'
        });
      }
      
    } catch (paymongoError) {
      console.error('PayMongo API Error:', paymongoError);
      return NextResponse.json({ 
        success: false, 
        status: 'error',
        message: 'Error checking payment status'
      });
    }

  } catch (error) {
    console.error('Payment Poll Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}