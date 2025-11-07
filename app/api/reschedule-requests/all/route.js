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
        }
      },
      orderBy: {
        createdAt: 'desc' // Most recent first
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
