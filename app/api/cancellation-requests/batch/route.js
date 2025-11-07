import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

// GET - Batch fetch cancellation requests for guest dashboard
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingIds = searchParams.get('bookingIds');

    if (!bookingIds) {
      return NextResponse.json({ cancellationRequests: {} });
    }

    const ids = bookingIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));

    if (ids.length === 0) {
      return NextResponse.json({ cancellationRequests: {} });
    }

    const requests = await prisma.cancellationRequest.findMany({
      where: {
        bookingId: { in: ids },
      },
      orderBy: {
        requestedAt: 'desc',
      },
      take: ids.length, // One per booking
    });

    // Map to bookingId for easy lookup
    const requestsMap = {};
    requests.forEach(req => {
      if (!requestsMap[req.bookingId]) {
        requestsMap[req.bookingId] = req;
      }
    });

    return NextResponse.json({ cancellationRequests: requestsMap });
  } catch (error) {
    console.error('❌ Batch fetch cancellation requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cancellation requests', details: error.message },
      { status: 500 }
    );
  }
}
