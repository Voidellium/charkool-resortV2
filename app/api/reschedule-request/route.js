import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Get latest reschedule request for a booking (with user info)
export async function GET(req) {
  try {
    const { searchParams } = req.nextUrl;
    const bookingId = parseInt(searchParams.get('bookingId'));
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }
    const reqObj = await prisma.rescheduleRequest.findFirst({
      where: { bookingId },
      orderBy: { requestedAt: 'desc' },
      include: { user: true },
    });
    if (!reqObj) {
      return NextResponse.json({ error: 'No reschedule request found' }, { status: 404 });
    }
    return NextResponse.json(reqObj);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
