import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { notifyStaff, notifyUser, EVENTS } from '@/lib/pusher-server';

// POST: Guest submits a reschedule request
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const data = await req.json();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Policy: Allow reschedule until 1 week (7 days) before check-in
    const now = new Date();
    const checkIn = new Date(booking.checkIn);
    const diffDays = (checkIn - now) / (1000 * 60 * 60 * 24);
    if (diffDays < 7) {
      return NextResponse.json({ error: 'Reschedule only allowed until 1 week (7 days) before check-in.' }, { status: 400 });
    }

    // Check for recent denied cancellation request (for one-time auto-approve)
    const deniedCancellation = await prisma.cancellationRequest.findFirst({
      where: {
        bookingId: booking.id,
        status: 'DENIED',
        userId: userId,
      },
      orderBy: {
        decidedAt: 'desc',
      },
    });

    // Check if there's already an auto-approved reschedule after this cancellation denial
    let hasUsedAutoApprove = false;
    if (deniedCancellation) {
      const autoApprovedReschedule = await prisma.rescheduleRequest.findFirst({
        where: {
          bookingId: booking.id,
          userId: userId,
          autoApproved: true,
          requestedAt: {
            gte: deniedCancellation.decidedAt,
          },
        },
      });
      hasUsedAutoApprove = !!autoApprovedReschedule;
    }

    // Check for existing pending request
    const existing = await prisma.rescheduleRequest.findFirst({
      where: {
        bookingId: booking.id,
        status: 'PENDING',
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'A reschedule request is already pending.' }, { status: 400 });
    }

    // Determine if this reschedule should be auto-approved
    const shouldAutoApprove = deniedCancellation && !hasUsedAutoApprove;

    // Create reschedule request
    const reqObj = await prisma.rescheduleRequest.create({
      data: {
        bookingId: booking.id,
        userId: userId || null,
        oldCheckIn: booking.checkIn,
        oldCheckOut: booking.checkOut,
        newCheckIn: new Date(data.checkIn),
        newCheckOut: new Date(data.checkOut),
        context: data.context || null,
        status: shouldAutoApprove ? 'APPROVED' : 'PENDING',
        autoApproved: shouldAutoApprove,
        decidedAt: shouldAutoApprove ? new Date() : null,
      },
    });

    // If auto-approved, update booking dates immediately
    if (shouldAutoApprove) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          checkIn: new Date(data.checkIn),
          checkOut: new Date(data.checkOut),
        },
      });

      // Notify guest of auto-approval
      await prisma.notification.create({
        data: {
          message: `Your reschedule request has been automatically approved (one-time courtesy after cancellation denial).`,
          type: 'reschedule_approved',
          role: 'CUSTOMER',
          bookingId: booking.id,
          userId: userId || null,
        },
      });

      return NextResponse.json({ 
        success: true, 
        request: reqObj,
        autoApproved: true,
        message: 'Reschedule automatically approved (one-time courtesy)',
      });
    }

    // Normal flow - notify superadmin
    // Get guest name for notification
    let guestName = 'Unknown Guest';
    if (booking.userId) {
      const user = await prisma.user.findUnique({ where: { id: booking.userId } });
      if (user) {
        guestName = `${user.firstName} ${user.lastName}`;
      }
    }
    await prisma.notification.create({
      data: {
        message: `A reschedule request from ${guestName}`,
        type: 'reschedule_request',
        role: 'SUPERADMIN',
        bookingId: booking.id,
        userId: userId || null,
      },
    });

    return NextResponse.json({ success: true, request: reqObj });
  } catch (error) {
    console.error('Reschedule POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Superadmin approves/denies a reschedule request
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const data = await req.json();
    const session = await getServerSession(authOptions);
    const adminId = session?.user?.id;
    const action = data.action; // 'APPROVE' or 'DENY'
    const context = data.context || null;

    const request = await prisma.rescheduleRequest.findUnique({
      where: { id: parseInt(id) },
      include: { booking: true, user: true },
    });
    if (!request) {
      return NextResponse.json({ error: 'Reschedule request not found' }, { status: 404 });
    }
    if (request.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }

    let updated;
    if (action === 'APPROVE') {
      // Update booking dates
      await prisma.booking.update({
        where: { id: request.bookingId },
        data: {
          checkIn: request.newCheckIn,
          checkOut: request.newCheckOut,
        },
      });
      updated = await prisma.rescheduleRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          decidedAt: new Date(),
          decidedById: adminId,
        },
      });
      // Notify guest
      await prisma.notification.create({
        data: {
          message: `Your reschedule request for booking #${request.bookingId} was approved.`,
          type: 'reschedule_approved',
          role: 'CUSTOMER',
          bookingId: request.bookingId,
          userId: request.userId,
        },
      });
      
      // 🔔 PUSHER: Notify guest and SuperAdmin about approval
      try {
        // Notify SuperAdmin (for page refresh)
        await notifyStaff('SUPERADMIN', {
          type: 'reschedule_approved',
          message: `Reschedule request #${request.id} has been approved for Booking #${request.bookingId}`,
          bookingId: request.bookingId,
          requestId: request.id,
          guestName: request.user?.firstName,
        });
        
        // Notify guest about approval and booking status change
        if (request.userId) {
          // Send notification
          await notifyUser(request.userId, EVENTS.NEW_NOTIFICATION, {
            type: 'reschedule_approved',
            message: `Your reschedule request has been approved. New dates: ${new Date(request.newCheckIn).toLocaleDateString()} to ${new Date(request.newCheckOut).toLocaleDateString()}`,
            bookingId: request.bookingId,
          });
          
          // Send booking status change event so guest dashboard updates in real-time
          await notifyUser(request.userId, EVENTS.BOOKING_STATUS_CHANGED, {
            bookingId: request.bookingId,
            status: 'Confirmed',
            checkIn: request.newCheckIn,
            checkOut: request.newCheckOut,
            message: 'Your reschedule request has been approved',
          });
        }
        console.log(`[Pusher] Notified about reschedule approval for request #${request.id}`);
      } catch (pusherErr) {
        console.warn('[Pusher] Failed to notify about reschedule approval:', pusherErr);
      }
    } else if (action === 'DENY') {
      updated = await prisma.rescheduleRequest.update({
        where: { id: request.id },
        data: {
          status: 'DENIED',
          adminContext: context,
          decidedAt: new Date(),
          decidedById: adminId,
        },
      });
      // Notify guest
      await prisma.notification.create({
        data: {
          message: `Your reschedule request for booking #${request.bookingId} was denied. Reason: ${context}`,
          type: 'reschedule_denied',
          role: 'CUSTOMER',
          bookingId: request.bookingId,
          userId: request.userId,
        },
      });
      
      // 🔔 PUSHER: Notify guest and SuperAdmin about denial
      try {
        // Notify SuperAdmin (for page refresh)
        await notifyStaff('SUPERADMIN', {
          type: 'reschedule_denied',
          message: `Reschedule request #${request.id} has been denied for Booking #${request.bookingId}`,
          bookingId: request.bookingId,
          requestId: request.id,
          guestName: request.user?.firstName,
        });
        
        // Notify guest about denial
        if (request.userId) {
          // Send notification
          await notifyUser(request.userId, EVENTS.NEW_NOTIFICATION, {
            type: 'reschedule_denied',
            message: `Your reschedule request has been denied. Reason: ${context}`,
            bookingId: request.bookingId,
          });
          
          // Send booking status change event so guest dashboard updates in real-time
          await notifyUser(request.userId, EVENTS.BOOKING_STATUS_CHANGED, {
            bookingId: request.bookingId,
            status: 'Confirmed',
            message: `Your reschedule request was denied. Reason: ${context}`,
          });
        }
        console.log(`[Pusher] Notified about reschedule denial for request #${request.id}`);
      } catch (pusherErr) {
        console.warn('[Pusher] Failed to notify about reschedule denial:', pusherErr);
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error('Reschedule PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
