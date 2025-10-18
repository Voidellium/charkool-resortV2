import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookingIdsParam = searchParams.get('bookingIds');
    
    if (!bookingIdsParam) {
      return NextResponse.json({ error: 'Missing bookingIds parameter' }, { status: 400 });
    }

    // Parse comma-separated booking IDs
    const bookingIds = bookingIdsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    
    if (bookingIds.length === 0) {
      return NextResponse.json({ rescheduleRequests: {} });
    }

    // Fetch all reschedule requests for the provided booking IDs in a single query
    const rescheduleRequests = await prisma.rescheduleRequest.findMany({
      where: {
        bookingId: {
          in: bookingIds
        }
      },
      orderBy: {
        requestedAt: 'desc'
      }
    });

    // Group by booking ID and get the latest request for each booking
    const latestRequests = {};
    rescheduleRequests.forEach(request => {
      if (!latestRequests[request.bookingId]) {
        latestRequests[request.bookingId] = request;
      }
    });

    return NextResponse.json({
      rescheduleRequests: latestRequests
    });

  } catch (error) {
    console.error('Error fetching batch reschedule requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}