// src/app/api/bookings/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: fetch rooms or all bookings
export const GET = async (req) => {
  try {
    const url = new URL(req.url);
    const checkIn = url.searchParams.get('checkIn');
    const checkOut = url.searchParams.get('checkOut');

    // If checkIn/checkOut provided → return available rooms
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const now = new Date();

      let rooms = await prisma.room.findMany({ orderBy: { name: 'asc' }, where: { type: { in: ['LOFT', 'TEPEE', 'VILLA', 'FAMILY_LODGE'] } } });

      const overlappingBookings = await prisma.booking.findMany({
        where: {
          AND: [
            { OR: [{ checkIn: { lte: checkOutDate }, checkOut: { gte: checkInDate } }] },
            { OR: [{ status: 'HELD' }, { status: 'PENDING' }, { status: 'CONFIRMED' }] },
            { OR: [{ heldUntil: null }, { heldUntil: { gt: now } }] },
          ],
        },
        select: { roomId: true },
      });

      const bookedCounts = {};
      overlappingBookings.forEach(b => {
        bookedCounts[b.roomId] = (bookedCounts[b.roomId] || 0) + 1;
      });

      rooms = rooms.map(r => {
        const booked = bookedCounts[r.id] || 0;
        const remaining = r.quantity - booked;
        return { ...r, available: remaining > 0, remaining };
      });

      return NextResponse.json(rooms);
    }

    // Otherwise → return all bookings
    const bookings = await prisma.booking.findMany({
      orderBy: { checkIn: 'asc' },
      include: {
        room: true,
        user: true,
        amenities: { include: { amenity: true } },
      },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('❌ Booking GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// POST: create a booking with amenities
export const POST = async (req) => {
  try {
    const body = await req.json();
    const { userId, roomId, checkIn, checkOut, guestName, amenityIds = [], totalPrice = 0 } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User must be logged in to book' }, { status: 401 });
    }

    if (!roomId || !checkIn || !checkOut) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Consider bookings that are HELD or CONFIRMED and not expired
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
    console.error('❌ Booking POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
