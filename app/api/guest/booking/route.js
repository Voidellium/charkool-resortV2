import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

// GET: fetch bookings for logged-in guest
export const GET = async (req) => {
  try {
    const token = await getToken({ req, secret: JWT_SECRET });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = parseInt(token.sub);

    const bookings = await prisma.booking.findMany({
      where: { userId },
      orderBy: { checkIn: 'asc' },
      include: {
        room: true,
        amenities: { include: { amenity: true } },
      },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('❌ Guest Booking GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// POST: create a booking for logged-in guest
export const POST = async (req) => {
  try {
    const token = await getToken({ req, secret: JWT_SECRET });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = parseInt(token.sub);

    const body = await req.json();
    const { roomId, checkIn, checkOut, guestName, amenityIds = [], totalPrice = 0 } = body;

    if (!roomId || !checkIn || !checkOut) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const now = new Date();
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        roomId,
        AND: [
          { OR: [{ status: 'HELD' }, { status: 'PENDING' }, { status: 'CONFIRMED' }] },
          { OR: [{ checkIn: { lte: checkOutDate }, checkOut: { gte: checkInDate } }] },
          { OR: [{ heldUntil: null }, { heldUntil: { gt: now } }] },
        ],
      },
    });

    if (overlappingBookings.length >= room.quantity) {
      return NextResponse.json({ error: 'Room fully booked or held for selected dates' }, { status: 400 });
    }

    const heldUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    const booking = await prisma.booking.create({
      data: {
        userId,
        room: { connect: { id: roomId } },
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guestName: guestName || 'Guest',
        status: 'HELD',
        paymentStatus: 'UNPAID',
        totalPrice,
        heldUntil,
        amenities: { create: amenityIds.map(id => ({ amenityInventoryId: id })) },
      },
      include: {
        room: true,
        amenities: { include: { amenity: true } },
      },
    });

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (error) {
    console.error('❌ Guest Booking POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
