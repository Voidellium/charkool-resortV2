import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!role || (role !== 'CASHIER' && role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { paymentId, amount, customerPaid, status, paymentMethod, referenceNo } = await req.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 });
    }

    console.log(`🔄 Updating payment ${paymentId} with status: ${status}`);

    // Find the payment record
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { 
        booking: {
          include: {
            user: true,
            payments: true
          }
        }
      },
    });

    if (!payment) {
      console.log(`❌ Payment not found: ${paymentId}`);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Calculate payment amounts
    const amountInCents = amount || payment.amount;
    const customerPaidInCents = customerPaid || payment.amount;
    const booking = payment.booking;

    // Determine final payment and booking status
  let finalPaymentStatus = status || 'Pending';
    let finalBookingStatus = booking.status;
    let finalBookingPaymentStatus = booking.paymentStatus;

    // If customer paid full amount or more, mark as paid
    if (customerPaidInCents >= payment.amount) {
      finalPaymentStatus = 'Paid';
      
      // Calculate total payments for this booking after this update
      const otherPayments = booking.payments.filter(p => p.id !== payment.id);
      const totalOtherPayments = otherPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalAfterUpdate = totalOtherPayments + customerPaidInCents;
      
      // Determine booking payment status based on total amount paid
      if (totalAfterUpdate >= booking.totalPrice) {
        finalBookingPaymentStatus = 'Paid';
        
        // Always keep booking status as 'Confirmed' when payment is complete
        // (BookingStatus enum only has: Confirmed, Pending, Cancelled, Held)
        finalBookingStatus = 'Confirmed';
      } else if (totalAfterUpdate >= Math.floor(booking.totalPrice / 2)) {
        finalBookingPaymentStatus = 'Partial';
        finalBookingStatus = 'Confirmed';
      } else if (totalAfterUpdate >= 200000) { // ₱2000 reservation fee
        finalBookingPaymentStatus = 'Reservation';
        finalBookingStatus = 'Pending';
      }
    }

    // Update payment record
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        amount: BigInt(customerPaidInCents),
        status: finalPaymentStatus,
        provider: paymentMethod ? (paymentMethod === 'gcash' || paymentMethod === 'paymaya' ? 'paymongo' : paymentMethod) : payment.provider,
        method: paymentMethod || payment.method,
        referenceId: referenceNo || payment.referenceId,
        updatedAt: new Date(),
      },
    });

    // Update booking status
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: {
        status: finalBookingStatus,
        paymentStatus: finalBookingPaymentStatus,
        updatedAt: new Date(),
      },
    });

    // Create audit trail for cashier action
    const auditData = {
      actorName: session?.user?.name || session?.user?.email || 'System',
      actorRole: role,
      action: 'UPDATE_PAYMENT',
      entity: 'Payment',
      entityId: payment.id,
      details: JSON.stringify({
        oldStatus: payment.status,
        newStatus: finalPaymentStatus,
        amount: customerPaidInCents,
        paymentMethod: paymentMethod || payment.method || payment.provider,
        bookingId: payment.bookingId,
        customerPaid: customerPaidInCents,
        originalAmount: Number(payment.amount)
      }),
    };

    await prisma.auditTrail.create({
      data: auditData
    });

    console.log(`✅ Payment ${paymentId} updated successfully`);

    return NextResponse.json({
      success: true,
      payment: {
        id: updatedPayment.id,
        amount: Number(updatedPayment.amount),
        status: updatedPayment.status,
        provider: updatedPayment.provider,
      },
      booking: {
        id: booking.id,
        status: finalBookingStatus,
        paymentStatus: finalBookingPaymentStatus,
      },
      change: Math.max(0, customerPaidInCents - Number(payment.amount)),
    });

  } catch (error) {
    console.error('❌ Payment update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update payment',
      details: error.message 
    }, { status: 500 });
  }
}