import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch all cancellation requests
export async function GET(req) {
  try {
    const cancellationRequests = await prisma.cancellationRequest.findMany({
      include: {
        booking: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            rooms: {
              include: {
                room: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: [
        {
          status: 'asc' // PENDING first
        },
        {
          requestedAt: 'desc' // Then by most recent
        }
      ]
    });

    return NextResponse.json({ 
      success: true,
      requests: cancellationRequests
    });
  } catch (error) {
    console.error('Error fetching cancellation requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cancellation requests' },
      { status: 500 }
    );
  }
}
