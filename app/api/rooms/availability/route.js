import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  console.log('[Availability API] Request received');
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    console.log('[Availability API] Date parameter:', date);

    if (!date) {
      console.log('[Availability API] Error: No date parameter');
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Parse the date
    const checkInDate = new Date(date);
    checkInDate.setHours(0, 0, 0, 0);

    // Get next day for checkout comparison
    const nextDay = new Date(checkInDate);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(23, 59, 59, 999);

    // Get all rooms grouped by type
    console.log('[Availability API] Fetching rooms from database');
    const rooms = await prisma.room.findMany({
      where: {
        status: 'available',
      },
      select: {
        id: true,
        type: true,
        quantity: true,
      },
    });
    console.log('[Availability API] Rooms found:', rooms.length);

    // Get bookings that overlap with the requested date
    console.log('[Availability API] Fetching bookings for date range:', checkInDate, 'to', nextDay);
    const bookings = await prisma.booking.findMany({
      where: {
        status: {
          in: ['Pending', 'Confirmed', 'Held', 'Completed'],
        },
        isDeleted: false,
        checkIn: {
          lt: nextDay,
        },
        checkOut: {
          gt: checkInDate,
        },
      },
      include: {
        rooms: {
          include: {
            room: true,
          },
        },
      },
    });
    console.log('[Availability API] Bookings found:', bookings.length);

    // Count booked rooms by type
    const bookedByType = {
      Villa: 0,
      Loft: 0,
      Teepee: 0,
    };

    bookings.forEach((booking) => {
      booking.rooms.forEach((bookingRoom) => {
        const roomType = bookingRoom.room.type;
        const quantity = bookingRoom.quantity || 1;
        if (bookedByType[roomType] !== undefined) {
          bookedByType[roomType] += quantity;
        }
      });
    });

    // Count total rooms by type
    const totalByType = {
      Villa: 0,
      Loft: 0,
      Teepee: 0,
    };

    rooms.forEach((room) => {
      const quantity = room.quantity || 1;
      if (totalByType[room.type] !== undefined) {
        totalByType[room.type] += quantity;
      }
    });

    // Calculate availability
    const availability = {
      villa: Math.max(0, totalByType.Villa - bookedByType.Villa),
      loft: Math.max(0, totalByType.Loft - bookedByType.Loft),
      teepee: Math.max(0, totalByType.Teepee - bookedByType.Teepee),
    };

    // Default to 4 if no rooms found
    if (totalByType.Villa === 0) availability.villa = 4;
    if (totalByType.Loft === 0) availability.loft = 4;
    if (totalByType.Teepee === 0) availability.teepee = 4;

    console.log('[Availability API] Final availability:', availability);
    return NextResponse.json(availability);
  } catch (error) {
    console.error('[Availability API] Error:', error);
    console.error('[Availability API] Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
