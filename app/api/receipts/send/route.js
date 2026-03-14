/**
 * POST /api/receipts/send
 * Send reservation receipt email to customer
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { sendReservationReceipt } from '@/src/lib/receiptService';
import { recordAudit } from '@/src/lib/audit';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    
    // Parse request body
    const { bookingId, paymentId } = await req.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Send the receipt email
    const result = await sendReservationReceipt(bookingId, paymentId);

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
        actorRole: session?.user?.role || 'SYSTEM',
        action: 'SEND_RECEIPT',
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
      message: 'Receipt sent successfully',
      receiptNumber: result.receiptNumber,
      sentTo: result.sentTo
    });

  } catch (error) {
    console.error('Error in /api/receipts/send:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}
