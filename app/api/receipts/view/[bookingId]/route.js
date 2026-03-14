/**
 * GET /api/receipts/view/[bookingId]
 * View/Download receipt HTML for a booking
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { generateReceiptData } from '@/src/lib/receiptService';
import prisma from '@/lib/prisma';

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { bookingId } = await params;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Fetch booking to check ownership
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      select: { userId: true, status: true, paymentStatus: true }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Authorization: Allow if user owns the booking, or is staff/admin
    const isOwner = session?.user?.id && booking.userId === session.user.id;
    const isStaff = session?.user?.role && ['SUPERADMIN', 'ADMIN', 'RECEPTIONIST', 'CASHIER'].includes(session.user.role);
    
    if (!isOwner && !isStaff) {
      return NextResponse.json(
        { error: 'Unauthorized to view this receipt' },
        { status: 403 }
      );
    }

    // Check if booking has a payment (reservation must be paid)
    if (booking.paymentStatus !== 'Reservation' && booking.paymentStatus !== 'Paid' && booking.paymentStatus !== 'Partial') {
      return NextResponse.json(
        { error: 'No payment found for this booking. Receipt not available.' },
        { status: 400 }
      );
    }

    // Generate receipt content
    const result = await generateReceiptData(bookingId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Return HTML content with proper headers for viewing/printing
    const htmlWithPrintStyles = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt #${result.receiptNumber} - Booking #${bookingId}</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }
    .print-controls {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      gap: 10px;
    }
    .print-btn {
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .print-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .print-btn-primary {
      background: #2563eb;
      color: white;
    }
    .print-btn-secondary {
      background: #6b7280;
      color: white;
    }
  </style>
</head>
<body>
  <div class="print-controls no-print">
    <button class="print-btn print-btn-primary" onclick="window.print()">
      🖨️ Print / Save as PDF
    </button>
    <button class="print-btn print-btn-secondary" onclick="window.close()">
      ✕ Close
    </button>
  </div>
  ${result.htmlContent}
</body>
</html>
`;

    return new NextResponse(htmlWithPrintStyles, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      }
    });

  } catch (error) {
    console.error('Error in /api/receipts/view/[bookingId]:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}
