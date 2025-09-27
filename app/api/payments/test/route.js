import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Development only: API to simulate a test payment method and mark booking as paid
// TODO: Remove this endpoint before production deployment

export async function POST(req) {
  try {
    const { bookingId, amount, status, bookingStatus, paymentType, method } = await req.json();

    if (!bookingId || !amount || !status || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Capitalize status to match enum
    const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

    // Create a payment record with appropriate status and method 'TEST'
    const payment = await prisma.payment.create({
      data: {
        bookingId: parseInt(bookingId),
        amount: Math.round(amount * 100), // store in cents
        status: capitalizedStatus,
        provider: method,
        referenceId: `test_${Date.now()}`,
      },
    });

    // Update booking with appropriate payment status and booking status
    const updateData = {
      paymentStatus: capitalizedStatus,
    };

    // Set booking status based on payment type
    if (bookingStatus) {
      updateData.status = bookingStatus.charAt(0).toUpperCase() + bookingStatus.slice(1).toLowerCase();
    } else if (paymentType === 'reservation') {
      updateData.status = 'Pending';
    } else if (paymentType === 'half') {
      updateData.status = 'Confirmed';
    } else {
      updateData.status = 'Confirmed';
    }

    // Handle amenities based on payment type
    if (paymentType === 'reservation') {
      // For reservation only, keep amenities but mark as pending
      updateData.paymentStatus = 'Pending';
    } else if (paymentType === 'half') {
      // For half payment, mark as partial payment
      updateData.paymentStatus = 'Partial';
    } else {
      // For full payment, mark as fully paid
      updateData.paymentStatus = 'Paid';
    }

    await prisma.booking.update({
      where: { id: parseInt(bookingId) },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      payment,
      message: `Payment processed successfully. Status: ${status}, Booking Status: ${updateData.status}`
    });
  } catch (error) {
    console.error('Test Payment Error:', error);
    return NextResponse.json({ error: 'Server error processing test payment' }, { status: 500 });
  }
}
