import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const where = {
      isDeleted: false,
      checkIn: {
        gte: start,
        lte: end
      }
    };

    const count = await prisma.booking.count({ where });

    const latest = await prisma.booking.findFirst({
      where,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, updatedAt: true, createdAt: true }
    });

    return NextResponse.json(serializeBigInt({
      count,
      latestBookingId: latest?.id || null,
      latestUpdatedAt: latest?.updatedAt ? latest.updatedAt.toISOString() : null,
      latestCreatedAt: latest?.createdAt ? latest.createdAt.toISOString() : null,
    }));
  } catch (error) {
    console.error('GET /api/bookings/upcoming/summary error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
