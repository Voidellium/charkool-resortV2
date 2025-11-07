import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

// PATCH - Approve or deny cancellation request
export async function PATCH(req, context) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['SUPERADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await context.params;
    const requestId = parseInt(id);
    const { action, adminContext } = await req.json();

    if (!['APPROVE', 'DENY'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'DENY' && !adminContext?.trim()) {
      return NextResponse.json({ error: 'Admin context/reason is required for denial' }, { status: 400 });
    }

    // Fetch the cancellation request
    const request = await prisma.cancellationRequest.findUnique({
      where: { id: requestId },
      include: {
        booking: {
          include: {
            rooms: true,
            user: true,
          },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Cancellation request not found' }, { status: 404 });
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json({ 
        error: `Request already ${request.status.toLowerCase()}` 
      }, { status: 400 });
    }

    if (action === 'APPROVE') {
      // Approve cancellation
      await prisma.$transaction(async (tx) => {
        // Update cancellation request
        await tx.cancellationRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            decidedAt: new Date(),
            decidedById: session.user.id,
            adminContext: adminContext || 'Approved',
          },
        });

        // Update booking to Cancelled
        await tx.booking.update({
          where: { id: request.bookingId },
          data: {
            status: 'Cancelled',
            paymentStatus: 'Refunded', // System marks as refunded, but actual refund is manual
            cancellationRemarks: `Cancellation approved by admin. No refund (within 7 days of check-in). Guest contact: ${request.booking.user?.email}, ${request.booking.user?.contactNumber}`,
            updatedAt: new Date(),
          },
        });

        // Create notification for guest
        await tx.notification.create({
          data: {
            message: `Your cancellation request for booking on ${new Date(request.booking.checkIn).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} to ${new Date(request.booking.checkOut).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} has been approved.`,
            type: 'cancellation_approved',
            role: 'CUSTOMER',
            bookingId: request.bookingId,
            userId: request.userId,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Cancellation request approved',
      });

    } else {
      // Deny cancellation - guest gets one-time auto-approve for reschedule
      await prisma.$transaction(async (tx) => {
        // Update cancellation request
        await tx.cancellationRequest.update({
          where: { id: requestId },
          data: {
            status: 'DENIED',
            decidedAt: new Date(),
            decidedById: session.user.id,
            adminContext: adminContext.trim(),
          },
        });

        // Revert booking status back to Confirmed
        await tx.booking.update({
          where: { id: request.bookingId },
          data: {
            status: 'Confirmed',
            updatedAt: new Date(),
          },
        });

        // Create notification for guest with reschedule option
        await tx.notification.create({
          data: {
            message: `Your cancellation request for booking on ${new Date(request.booking.checkIn).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} to ${new Date(request.booking.checkOut).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} has been denied. Reason: ${adminContext.trim()}. You may reschedule your booking instead.`,
            type: 'cancellation_denied',
            role: 'CUSTOMER',
            bookingId: request.bookingId,
            userId: request.userId,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Cancellation request denied',
      });
    }

  } catch (error) {
    console.error('❌ Process cancellation request error:', error);
    return NextResponse.json(
      { error: 'Failed to process cancellation request', details: error.message },
      { status: 500 }
    );
  }
}
