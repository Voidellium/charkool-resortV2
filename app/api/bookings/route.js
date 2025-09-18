import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: fetch rooms or all bookings
export const GET = async (req) => {
  try {
    const url = new URL(req.url);
    const checkIn = url.searchParams.get('checkIn');
    const checkOut = url.searchParams.get('checkOut');

    // If checkIn/checkOut provided -> return available rooms
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const now = new Date();

      let rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });

      const overlappingBookings = await prisma.booking.findMany({
        where: {
          AND: [
            { OR: [{ checkIn: { lte: checkOutDate }, checkOut: { gt: checkInDate } }] },
            {
              OR: [
                { status: 'HELD', heldUntil: { gt: now } },
                { status: 'PENDING' },
                { status: 'CONFIRMED' },
                { status: 'CHECKED_IN' },
              ],
            },
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

    // Otherwise -> return all bookings
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
    const { userId, roomId, checkIn, checkOut, guestName, amenityIds = [], status = 'HELD', paymentStatus = 'UNPAID' } = body;

    // Check for required fields for a walk-in booking
    if (!roomId || !checkIn || !checkOut || !guestName) {
      return NextResponse.json({ error: 'Missing required fields: roomId, checkIn, checkOut, guestName' }, { status: 400 });
    }

    // Convert roomId to integer
    const parsedRoomId = parseInt(roomId);
    if (isNaN(parsedRoomId)) {
      return NextResponse.json({ error: 'Invalid roomId: must be a number' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { id: parsedRoomId } });
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json({ error: 'Invalid check-in or check-out date' }, { status: 400 });
    }

    // Check for room availability for the selected dates
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        roomId: parsedRoomId,
        AND: [
          { OR: [{ checkIn: { lte: checkOutDate }, checkOut: { gt: checkInDate } }] },
          {
            OR: [
              { status: 'HELD' },
              { status: 'PENDING' },
              { status: 'CONFIRMED' },
              { status: 'CHECKED_IN' }
            ],
          },
        ],
      },
    });

    if (overlappingBookings.length >= room.quantity) {
      return NextResponse.json({ error: 'Room fully booked or held for selected dates' }, { status: 400 });
    }

    const bookingData = {
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guestName: guestName,
      status: status,
      paymentStatus: paymentStatus,
      room: { connect: { id: parsedRoomId } },
    };

    // Conditionally add amenities and user if they exist
    if (amenityIds && amenityIds.length > 0) {
      // Convert amenityIds to integers
      const parsedAmenityIds = amenityIds.map(id => parseInt(id)).filter(id => !isNaN(id));

      if (parsedAmenityIds.length !== amenityIds.length) {
        return NextResponse.json({
          error: 'Invalid amenity IDs: all must be numbers'
        }, { status: 400 });
      }

      // Validate that all amenity IDs exist
      const existingAmenities = await prisma.amenityInventory.findMany({
        where: { id: { in: parsedAmenityIds } },
        select: { id: true }
      });

      const existingIds = existingAmenities.map(a => a.id);
      const invalidIds = parsedAmenityIds.filter(id => !existingIds.includes(id));

      if (invalidIds.length > 0) {
        return NextResponse.json({
          error: `Invalid amenity IDs: ${invalidIds.join(', ')}`
        }, { status: 400 });
      }

      bookingData.amenities = { create: parsedAmenityIds.map(id => ({ amenityInventoryId: id })) };
    }

    if (userId) {
      // Convert userId to integer
      const parsedUserId = parseInt(userId);
      if (isNaN(parsedUserId)) {
        return NextResponse.json({ error: 'Invalid userId: must be a number' }, { status: 400 });
      }

      // Validate that the user exists
      const user = await prisma.user.findUnique({ where: { id: parsedUserId } });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      bookingData.user = { connect: { id: parsedUserId } };
    }

    const booking = await prisma.booking.create({
      data: bookingData,
      include: {
        room: true,
        amenities: { include: { amenity: true } },
      },
    });

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (error) {
    console.error('❌ Booking POST Error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
    });

    // Return more detailed error for debugging (remove in production)
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: error.code || 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
};