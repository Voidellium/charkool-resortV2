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
        optionalAmenities: { include: { optionalAmenity: true } },
        rentalAmenities: { include: { rentalAmenity: true } },
        cottage: { include: { cottage: true } },
      },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('❌ Booking GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// POST: create a booking with the new amenity system
export const POST = async (req) => {
  try {
    const body = await req.json();
    const {
      userId,
      roomId,
      checkIn,
      checkOut,
      guestName,
      optionalAmenities = {},
      rentalAmenities = {},
      cottage,
      status = 'HELD',
      paymentStatus = 'UNPAID',
    } = body;

    if (!roomId || !checkIn || !checkOut) {
      return NextResponse.json({ error: 'Missing required fields: roomId, checkIn, checkOut' }, { status: 400 });
    }

    // --- Data Validation and Parsing ---
    const parsedRoomId = parseInt(roomId, 10);
    if (isNaN(parsedRoomId)) {
        return NextResponse.json({ error: 'Invalid roomId format' }, { status: 400 });
    }

    const parsedUserId = userId ? parseInt(userId, 10) : null;
    if (userId && isNaN(parsedUserId)) {
        return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { id: parsedRoomId } });
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.max(1, (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    // --- Server-side Price Calculation ---
    let finalTotalPrice = room.price * nights;

    // Rental Amenities Price
    const rentalIds = Object.keys(rentalAmenities).map(id => parseInt(id));
    const rentalAmenityDetails = await prisma.rentalAmenity.findMany({
      where: { id: { in: rentalIds } },
    });

    const rentalCreations = [];
    for (const amenity of rentalAmenityDetails) {
      const selection = rentalAmenities[amenity.id];
      if (!selection || selection.quantity === 0) continue;

      const quantity = selection.quantity || 0;
      const hours = selection.hoursUsed || 0;
      let amenityPrice = 0;

      if (hours > 0 && amenity.pricePerHour) {
        amenityPrice = hours * amenity.pricePerHour;
      } else {
        amenityPrice = quantity * amenity.pricePerUnit;
      }
      finalTotalPrice += amenityPrice;

      rentalCreations.push({
        rentalAmenityId: amenity.id,
        quantity,
        hoursUsed: hours,
        totalPrice: amenityPrice,
      });
    }

    // Cottage Price
    const cottageCreations = [];
    if (cottage && cottage.quantity > 0) {
      const cottageDetails = await prisma.cottage.findFirst();
      if (cottageDetails) {
        const cottagePrice = cottage.quantity * cottageDetails.price;
        finalTotalPrice += cottagePrice;
        cottageCreations.push({
          cottageId: cottageDetails.id,
          quantity: cottage.quantity,
          totalPrice: cottagePrice,
        });
      }
    }
    
    // Optional Amenities (no price impact)
    const optionalIds = Object.keys(optionalAmenities).map(id => parseInt(id));
    const optionalCreations = optionalIds.map(id => ({
        optionalAmenityId: id,
        quantity: optionalAmenities[id],
    }));

    // --- Database Transaction ---
    const result = await prisma.$transaction(async (tx) => {
      // Verify room availability again inside the transaction
      const overlappingBookings = await tx.booking.count({
        where: {
          roomId: parsedRoomId,
          status: { in: ['HELD', 'PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate },
        },
      });

      if (overlappingBookings >= room.quantity) {
        throw new Error('Room is no longer available for the selected dates.');
      }

      const newBooking = await tx.booking.create({
        data: {
          userId: parsedUserId,
          roomId: parsedRoomId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guestName: guestName || 'Walk-in Guest',
          status,
          paymentStatus,
          totalPrice: finalTotalPrice,
          heldUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minute hold
          optionalAmenities: {
            create: optionalCreations,
          },
          rentalAmenities: {
            create: rentalCreations,
          },
          cottage: {
            create: cottageCreations,
          },
        },
        include: {
          room: true,
          optionalAmenities: true,
          rentalAmenities: true,
          cottage: true,
        },
      });

      return newBooking;
    });

    return NextResponse.json({ success: true, booking: result }, { status: 201 });

  } catch (error) {
    console.error('❌ Booking POST Error:', error);
    return NextResponse.json(
      { 
        error: 'Booking failed', 
        details: error.message || 'Internal server error' 
      }, 
      { status: error.message.includes('longer available') ? 409 : 500 }
    );
  }
};