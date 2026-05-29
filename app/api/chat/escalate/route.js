import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { notifyStaff } from '@/lib/pusher-server';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    const body = await req.json();
    const { reason, guestEmail, guestName, contactNumber } = body;

    if ((!reason || reason.trim().length === 0) && !guestName) {
      return NextResponse.json(
        { error: 'Please provide a reason for your request' },
        { status: 400 }
      );
    }

    // Rate-limit: prevent spam by allowing one escalation per 5 minutes per user/email
    const cooldownMinutes = 5;
    const cutoff = new Date(Date.now() - cooldownMinutes * 60 * 1000);

    if (session && session.user?.id) {
      const recent = await prisma.chatEscalation.findFirst({
        where: {
          userId: parseInt(session.user.id),
          createdAt: { gt: cutoff }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (recent) {
        return NextResponse.json(
          { error: `Please wait ${cooldownMinutes} minutes before requesting admin contact again.` },
          { status: 429 }
        );
      }
    } else {
      // Anonymous: require guestEmail and rate-limit by email
      if (!guestEmail || guestEmail.trim().length === 0) {
        return NextResponse.json(
          { error: 'Please provide an email so we can contact you' },
          { status: 400 }
        );
      }

      const recentByEmail = await prisma.chatEscalation.findFirst({
        where: {
          guestEmail: { equals: guestEmail.trim(), mode: 'insensitive' },
          createdAt: { gt: cutoff }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (recentByEmail) {
        return NextResponse.json(
          { error: `An escalation was recently submitted for this email. Please wait ${cooldownMinutes} minutes.` },
          { status: 429 }
        );
      }
    }

    // Build data payload for Prisma create
    const dataPayload = {
      guestEmail: (session && session.user?.email) ? session.user.email : (guestEmail ? guestEmail.trim() : ''),
      reason: reason ? reason.trim() : 'Guest requested admin contact',
      status: 'pending',
      notes: undefined
    };

    if (session && session.user?.id) {
      dataPayload.userId = parseInt(session.user.id);
    } else {
      // store provided contact details in notes for anonymous escalations
      const contactDetails = [];
      if (guestName) contactDetails.push(`Name: ${guestName}`);
      if (contactNumber) contactDetails.push(`Phone: ${contactNumber}`);
      if (guestEmail) contactDetails.push(`Email: ${guestEmail}`);
      if (contactDetails.length > 0) dataPayload.notes = contactDetails.join(' | ');
    }

    // Create escalation request
    const escalation = await prisma.chatEscalation.create({
      data: dataPayload
    });

    // Notify Super Admin
    await notifyStaff('SUPERADMIN', {
      event: 'CHAT_ESCALATION_REQUEST',
      type: 'escalation_request',
      message: `${(session && (session.user?.name || session.user?.email)) || guestEmail} requested direct contact`,
      escalationId: escalation.id,
      guestName: (session && session.user?.name) || guestName,
      guestEmail: dataPayload.guestEmail,
      reason: dataPayload.reason,
      contactNumber: contactNumber || null
    });

    return NextResponse.json({ 
      success: true, 
      escalationId: escalation.id,
      message: 'Thank you. A Super Admin will contact you within 24 hours via email or the contact details you provided.'
    });
  } catch (error) {
    console.error('Failed to create escalation request:', error);
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only Super Admin can view escalations
    if (!session || session.user?.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'pending';
    
    const escalations = await prisma.chatEscalation.findMany({
      where: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            contactNumber: true
          }
        },
        contactedByUser: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return NextResponse.json(escalations);
  } catch (error) {
    console.error('Failed to fetch escalations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch escalations' },
      { status: 500 }
    );
  }
}
