import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { sendReservationReceipt } from '@/src/lib/receiptService';
import { triggerEvent, notifyStaff, CHANNELS, EVENTS } from '@/lib/pusher-server';

export async function POST(req) {
  try {
    // Read the raw body and the PayMongo signature from the headers
    const rawBody = await req.text();
  const paymongoSignature = req.headers.get('Paymongo-Signature');

    // ✅ IMPORTANT: Verify the webhook signature
    // This protects your endpoint from malicious requests
    const secretKey = process.env.PAYMONGO_WEBHOOK_SECRET;
    if (!paymongoSignature || !secretKey) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 401 });
    }
    const parts = Object.fromEntries(paymongoSignature.split(',').map(s => s.split('=')));
    const timestamp = parts.t;
    const signature = parts.v1;
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
      const payment = await prisma.payment.findFirst({
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
          'Authorization': `Basic ${Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString('base64')}`
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: payment.amount,
              source: { id: sourceId, type: 'source' },
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
          data: { status: 'Pending' },
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

      // ✅ Idempotency check: only update if the status is not already 'Paid'
      if (payment.status !== 'Paid') {
        // Update payment to Paid
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'Paid' },
        });
        // Reservation-only semantics: keep booking Pending but mark paymentStatus as Reservation and clear heldUntil
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            status: 'Pending',
            paymentStatus: 'Reservation',
            heldUntil: null,
          },
        });
        // Reset user cooldown upon successful reservation payment
        const booking = await prisma.booking.findUnique({ where: { id: payment.bookingId } });
        if (booking?.userId) {
          await prisma.user.update({
            where: { id: booking.userId },
            data: { failedPaymentAttempts: 0, paymentCooldownUntil: null },
          });
        }

        // 📧 Send reservation receipt email to customer
        try {
          const receiptResult = await sendReservationReceipt(payment.bookingId, payment.id);
          if (receiptResult.success) {
            console.log(`✅ Receipt email sent for Booking #${payment.bookingId}:`, receiptResult.receiptNumber);
          } else {
            console.warn(`⚠️ Failed to send receipt email for Booking #${payment.bookingId}:`, receiptResult.error);
          }
        } catch (receiptError) {
          // Don't fail the webhook if receipt email fails - payment is already processed
          console.error('❌ Error sending receipt email:', receiptError);
        }

        // Create notification for guest about successful payment
        try {
          await prisma.notification.create({
            data: {
              message: `Your reservation payment for Booking #${payment.bookingId} was successful! Check your email for the receipt.`,
              type: 'PAYMENT_SUCCESS',
              role: 'GUEST',
              bookingId: payment.bookingId,
              userId: booking?.userId
            }
          });
        } catch (notifError) {
          console.warn('Failed to create payment success notification:', notifError);
        }

        // 🔔 PUSHER: Notify dashboards about payment received
        try {
          const pusherData = {
            bookingId: payment.bookingId,
            paymentId: payment.id,
            guestName: payment.booking?.guestName || 'Guest',
            amount: payment.amount,
            status: 'Pending',
            paymentStatus: 'Reservation'
          };
          
          // Notify booking channel (staff dashboards will refresh)
          await triggerEvent(CHANNELS.BOOKINGS, EVENTS.BOOKING_UPDATED, pusherData);
          await triggerEvent(CHANNELS.BOOKINGS, EVENTS.PAYMENT_RECEIVED, pusherData);
          
          // Notify all staff roles
          await notifyStaff('SUPERADMIN', { 
            type: 'payment_received', 
            message: `Payment received from ${pusherData.guestName}`, 
            ...pusherData 
          });
          await notifyStaff('RECEPTIONIST', { 
            type: 'payment_received', 
            message: `Payment received from ${pusherData.guestName}`, 
            ...pusherData 
          });
          await notifyStaff('CASHIER', { 
            type: 'payment_received', 
            message: `Payment received from ${pusherData.guestName}`, 
            ...pusherData 
          });
          console.log(`✅ [Pusher] Sent payment notification for Booking #${payment.bookingId}`);
        } catch (pusherErr) {
          console.warn('[Pusher] Failed to send payment notification:', pusherErr);
        }
      }
    }

    // Respond with a 200 OK to acknowledge receipt of the event
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    return NextResponse.json({ error: 'Server error processing webhook' }, { status: 500 });
  }
}