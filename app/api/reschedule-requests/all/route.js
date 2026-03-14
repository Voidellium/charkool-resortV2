import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch all reschedule requests with user information
export async function GET(req) {
  try {
    const rescheduleRequests = await prisma.rescheduleRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        booking: {
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            guestName: true
          }
        }
      },
      orderBy: {
        requestedAt: 'desc' // Most recent first - correct field name
      }
    });

    return NextResponse.json({ 
      success: true,
      requests: rescheduleRequests 
    });
  } catch (error) {
    console.error('Error fetching all reschedule requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reschedule requests' },
      { status: 500 }
    );
  }
}
