/**
 * POST /api/receipts/resend
 * Resend reservation receipt email to customer
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { resendReservationReceipt } from '@/src/lib/receiptService';
import { recordAudit } from '@/src/lib/audit';
import prisma from '@/lib/prisma';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    
    // Parse request body
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Verify user owns this booking or is staff
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      select: { userId: true, paymentStatus: true }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const isOwner = session?.user?.id && booking.userId === session.user.id;
    const isStaff = session?.user?.role && ['SUPERADMIN', 'ADMIN', 'RECEPTIONIST', 'CASHIER'].includes(session.user.role);

    if (!isOwner && !isStaff) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if booking has payment
    if (booking.paymentStatus !== 'Reservation' && booking.paymentStatus !== 'Paid' && booking.paymentStatus !== 'Partial') {
      return NextResponse.json(
        { error: 'No payment found for this booking' },
        { status: 400 }
      );
    }

    // Resend the receipt
    const result = await resendReservationReceipt(bookingId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: 500 }
      );
    }

    // Record audit
    try {
      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || session?.user?.email || 'System',
        actorRole: session?.user?.role || 'GUEST',
        action: 'RESEND_RECEIPT',
        entity: 'Booking',
        entityId: String(bookingId),
        details: JSON.stringify({
          receiptNumber: result.receiptNumber,
          sentTo: result.sentTo
        })
      });
    } catch (auditError) {
      console.warn('Failed to record audit:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Receipt resent successfully',
      receiptNumber: result.receiptNumber,
      sentTo: result.sentTo
    });

  } catch (error) {
    console.error('Error in /api/receipts/resend:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}
