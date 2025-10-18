import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

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

    // Policy: Only allow reschedule 2 weeks before check-in
    const now = new Date();
    const checkIn = new Date(booking.checkIn);
    const diffDays = (checkIn - now) / (1000 * 60 * 60 * 24);
    if (diffDays < 14) {
      return NextResponse.json({ error: 'Reschedule only allowed 2 weeks prior to check-in.' }, { status: 400 });
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
      },
    });

    // Notify superadmin
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
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error('Reschedule PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
