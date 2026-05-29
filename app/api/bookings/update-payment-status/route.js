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

    const { 
      bookingId, 
      paymentStatus, 
      status, 
      paymentMethod, 
      referenceNo, 
      amountPaid,
      receiptData,
      processContext
    } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    console.log(`🔄 Updating booking ${bookingId} payment status to: ${paymentStatus}`);

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      include: {
        payments: true,
        user: true
      }
    });

    if (!booking) {
      console.log(`❌ Booking not found: ${bookingId}`);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const normalizedPaymentStatus = String(paymentStatus || booking.paymentStatus || '').trim();
    const isCheckoutContext = String(processContext || '').toLowerCase() === 'checkout';

    // Checkout is handled in booking management (actualCheckOut flow), not payment processing.
    if (isCheckoutContext) {
      return NextResponse.json(
        { error: 'Checkout actions are restricted to Booking Management.' },
        { status: 403 }
      );
    }

    // Payment endpoint only updates financial status and keeps booking in operational flow.
    let nextBookingStatus = booking.status;
    if (['Paid', 'Partial', 'Reservation'].includes(normalizedPaymentStatus)) {
      nextBookingStatus = 'Confirmed';
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(bookingId) },
      data: {
        status: nextBookingStatus,
        paymentStatus: normalizedPaymentStatus || booking.paymentStatus,
      },
    });

    // Create a payment record for this checkout transaction
    if (amountPaid && paymentMethod) {
      await prisma.payment.create({
        data: {
          bookingId: parseInt(bookingId),
          amount: BigInt(amountPaid),
          currency: 'PHP',
          status: normalizedPaymentStatus === 'Partial' ? 'Partial' : 'Paid',
          provider: paymentMethod === 'cash' ? 'cash' : 'paymongo',
          method: paymentMethod,
          referenceId: referenceNo || `CHECKOUT-${Date.now()}`,
          verificationStatus: 'Verified',
          verifiedById: session?.user?.id,
          verifiedAt: new Date(),
          receiptNumber: receiptData?.id || `RCP-${Date.now()}`,
        }
      });
    }

    // Create audit trail
    const auditData = {
      actorName: session?.user?.name || session?.user?.email || 'System',
      actorRole: role,
      action: 'PROCESS_CHECKOUT_PAYMENT',
      entity: 'Booking',
      entityId: bookingId.toString(),
      details: JSON.stringify({
        oldStatus: booking.status,
        newStatus: nextBookingStatus,
        oldPaymentStatus: booking.paymentStatus,
        newPaymentStatus: normalizedPaymentStatus,
        paymentMethod: paymentMethod,
        amountPaid: amountPaid,
        referenceNo: referenceNo,
        receiptId: receiptData?.id,
        processContext: processContext || 'arrival'
      }),
    };

    await prisma.auditTrail.create({
      data: auditData
    });

    console.log(`✅ Booking ${bookingId} updated successfully`);

    return NextResponse.json({
      success: true,
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        paymentStatus: updatedBooking.paymentStatus,
      },
    });

  } catch (error) {
    console.error('❌ Booking payment status update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update booking payment status',
      details: error.message 
    }, { status: 500 });
  }
}
