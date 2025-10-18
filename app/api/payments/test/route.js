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

    // Enforce reservation-only flow
    if (paymentType && paymentType !== 'reservation') {
      return NextResponse.json({ error: 'Only reservation payments are allowed' }, { status: 400 });
    }

    // Load booking and validate reservation amount = 2000 * totalRooms
    const booking = await prisma.booking.findUnique({ where: { id: parseInt(bookingId) }, include: { rooms: true } });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    const totalRooms = (booking.rooms || []).reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const expectedAmount = totalRooms * 2000; // pesos
    if (Math.round(Number(amount)) !== Math.round(expectedAmount)) {
      return NextResponse.json({ error: `Invalid amount. Expected ₱${expectedAmount}` }, { status: 400 });
    }

    // Capitalize status to match enum
    const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

    // Create a payment record with appropriate status and method 'TEST'
    const payment = await prisma.payment.create({
      data: {
        bookingId: parseInt(bookingId),
        amount: Math.round(amount * 100), // store in cents to be consistent with other payment methods
        status: capitalizedStatus,
        provider: method,
        referenceId: `test_${Date.now()}`,
      },
    });

    // Update booking with appropriate payment status and booking status
    const updateData = {
      paymentStatus: 'Reservation',
    };

    // Set booking status based on payment type
    // For reservation-only, keep booking pending
    if (bookingStatus) {
      updateData.status = bookingStatus.charAt(0).toUpperCase() + bookingStatus.slice(1).toLowerCase();
    } else {
      updateData.status = 'Pending';
    }

    // Handle amenities based on payment type
    // Reservation-only payment status
    updateData.paymentStatus = 'Reservation';

    await prisma.booking.update({
      where: { id: parseInt(bookingId) },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      payment: JSON.parse(JSON.stringify(payment, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )),
      message: `Payment processed successfully. Status: ${status}, Booking Status: ${updateData.status}`
    });
  } catch (error) {
    console.error('Test Payment Error:', error);
    return NextResponse.json({ error: 'Server error processing test payment' }, { status: 500 });
  }
}
