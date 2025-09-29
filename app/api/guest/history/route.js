import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

// GET: fetch booking history for logged-in guest
export const GET = async (req) => {
  try {
    const token = await getToken({ req, secret: JWT_SECRET });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = parseInt(token.sub);

    const bookings = await prisma.booking.findMany({
      where: { userId },
      orderBy: { checkIn: 'desc' },
      include: {
        rooms: { include: { room: true } },
        amenities: { include: { amenity: true } },
        payments: true,
      },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('❌ Guest History GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
