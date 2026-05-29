import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { notifyStaff, notifyUser, EVENTS } from '@/lib/pusher-server';
import { sendBookingDecisionEmail } from '@/src/lib/bookingDecisionEmailService';

// PATCH - Approve or deny cancellation request
export async function PATCH(req, context) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await context.params;
    const requestId = parseInt(id);
    const { action, adminContext } = await req.json();

    if (!['APPROVE', 'DENY'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const decisionReason = adminContext?.trim();
    if (!decisionReason) {
      return NextResponse.json({ error: 'Admin context/reason is required' }, { status: 400 });
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
            adminContext: decisionReason,
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

      // 🔔 PUSHER: Notify SuperAdmin about approval and guest about decision
      try {
        // Notify SuperAdmin that request was approved (for page refresh)
        await notifyStaff('SUPERADMIN', {
          type: 'cancellation_approved',
          message: `Cancellation request #${requestId} has been approved for Booking #${request.bookingId}`,
          bookingId: request.bookingId,
          requestId: requestId,
          guestName: request.booking.user?.firstName,
        });
        
        // Notify guest about approval
        if (request.userId) {
          // Send notification
          await notifyUser(request.userId, EVENTS.NEW_NOTIFICATION, {
            type: 'cancellation_approved',
            message: `Your cancellation request has been approved`,
            bookingId: request.bookingId,
          });
          
          // Send booking status change event so guest dashboard updates in real-time
          await notifyUser(request.userId, EVENTS.BOOKING_STATUS_CHANGED, {
            bookingId: request.bookingId,
            status: 'Cancelled',
            message: 'Your booking has been cancelled',
          });
        }
        console.log(`[Pusher] Notified about cancellation approval for request #${requestId}`);
      } catch (pusherErr) {
        console.warn('[Pusher] Failed to notify about cancellation approval:', pusherErr);
      }

      if (request.booking?.user?.email) {
        const guestName = [request.booking.user?.firstName, request.booking.user?.lastName].filter(Boolean).join(' ').trim();
        const emailResult = await sendBookingDecisionEmail({
          to: request.booking.user.email,
          guestName,
          bookingId: request.bookingId,
          requestType: 'cancellation',
          action: 'APPROVE',
          reason: decisionReason,
          oldCheckIn: request.booking.checkIn,
          oldCheckOut: request.booking.checkOut,
        });
        if (!emailResult.success) {
          console.warn('Failed to send cancellation approval email:', emailResult.error);
        }
      }

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
            adminContext: decisionReason,
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
            message: `Your cancellation request for booking on ${new Date(request.booking.checkIn).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} to ${new Date(request.booking.checkOut).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} has been denied. Reason: ${decisionReason}. You may reschedule your booking instead.`,
            type: 'cancellation_denied',
            role: 'CUSTOMER',
            bookingId: request.bookingId,
            userId: request.userId,
          },
        });
      });

      // 🔔 PUSHER: Notify SuperAdmin about denial and guest about decision
      try {
        // Notify SuperAdmin that request was denied (for page refresh)
        await notifyStaff('SUPERADMIN', {
          type: 'cancellation_denied',
          message: `Cancellation request #${requestId} has been denied for Booking #${request.bookingId}`,
          bookingId: request.bookingId,
          requestId: requestId,
          guestName: request.booking.user?.firstName,
        });
        
        // Notify guest about denial
        if (request.userId) {
          // Send notification
          await notifyUser(request.userId, EVENTS.NEW_NOTIFICATION, {
            type: 'cancellation_denied',
            message: `Your cancellation request has been denied. Reason: ${decisionReason}. You may reschedule instead.`,
            bookingId: request.bookingId,
          });
          
          // Send booking status change event so guest dashboard updates in real-time
          await notifyUser(request.userId, EVENTS.BOOKING_STATUS_CHANGED, {
            bookingId: request.bookingId,
            status: 'Confirmed',
            message: `Your cancellation request was denied. Reason: ${decisionReason}. You may reschedule instead.`,
          });
        }
        console.log(`[Pusher] Notified about cancellation denial for request #${requestId}`);
      } catch (pusherErr) {
        console.warn('[Pusher] Failed to notify about cancellation denial:', pusherErr);
      }

      if (request.booking?.user?.email) {
        const guestName = [request.booking.user?.firstName, request.booking.user?.lastName].filter(Boolean).join(' ').trim();
        const emailResult = await sendBookingDecisionEmail({
          to: request.booking.user.email,
          guestName,
          bookingId: request.bookingId,
          requestType: 'cancellation',
          action: 'DENY',
          reason: decisionReason,
          oldCheckIn: request.booking.checkIn,
          oldCheckOut: request.booking.checkOut,
        });
        if (!emailResult.success) {
          console.warn('Failed to send cancellation denial email:', emailResult.error);
        }
      }

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
