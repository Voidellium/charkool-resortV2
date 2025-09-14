import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

// GET: fetch logged-in guest info and bookings
export const GET = async (req) => {
  try {
    const token = await getToken({ req, secret: JWT_SECRET });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = parseInt(token.sub);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const bookings = await prisma.booking.findMany({
      where: { userId },
      orderBy: { checkIn: 'desc' },
      include: {
        room: true,
        amenities: { include: { amenity: true } },
        payments: true,
      },
    });

    return NextResponse.json({ guest: user, bookings });
  } catch (error) {
    console.error('❌ Guest Me GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
