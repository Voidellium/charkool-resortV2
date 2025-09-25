import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        user: true,
        room: true,
        payments: true,
        amenities: {
          include: {
            amenity: true,
          },
        },
        optionalAmenities: {
          include: {
            optionalAmenity: true,
          },
        },
        rentalAmenities: {
          include: {
            rentalAmenity: true,
          },
        },
        cottage: {
          include: {
            cottage: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Fetch Bookings Error:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      guestName,
      checkIn,
      checkOut,
      roomId,
      optional,
      rental,
      cottage,
      status = 'Pending',
      paymentStatus = 'Pending',
      userId = null
    } = data;

    if (!guestName || !checkIn || !checkOut || !roomId) {
      return NextResponse.json(
        { error: 'Missing required fields: guestName, checkIn, checkOut, roomId' },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { id: parseInt(roomId) },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)) || 1;
    let calculatedTotalPrice = room.price * nights;

    const optionalAmenitiesToCreate = [];
    if (optional && Object.keys(optional).length > 0) {
      const amenityIds = Object.keys(optional).map(id => parseInt(id));
      const amenitiesDetails = await prisma.optionalAmenity.findMany({
        where: { id: { in: amenityIds } },
      });
      for (const amenity of amenitiesDetails) {
        optionalAmenitiesToCreate.push({
          optionalAmenityId: amenity.id,
          quantity: optional[amenity.id],
        });
      }
    }

    const rentalAmenitiesToCreate = [];
    if (rental && Object.keys(rental).length > 0) {
      const amenityIds = Object.keys(rental).map(id => parseInt(id));
      const amenitiesDetails = await prisma.rentalAmenity.findMany({
        where: { id: { in: amenityIds } },
      });

      for (const amenity of amenitiesDetails) {
        const selection = rental[amenity.id];
        let amenityPrice = 0;
        if (selection.hoursUsed > 0 && amenity.pricePerHour) {
          amenityPrice = selection.hoursUsed * amenity.pricePerHour;
        } else {
          amenityPrice = selection.quantity * amenity.pricePerUnit;
        }
        calculatedTotalPrice += amenityPrice;
        rentalAmenitiesToCreate.push({
          rentalAmenityId: amenity.id,
          quantity: selection.quantity,
          hoursUsed: selection.hoursUsed,
          totalPrice: amenityPrice,
        });
      }
    }

    const cottageToCreate = [];
    // Cottage logic can be added here if needed in the future

    const booking = await prisma.booking.create({
      data: {
        guestName,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        roomId: parseInt(roomId),
        status,
        paymentStatus,
        totalPrice: calculatedTotalPrice,
        userId: userId ? parseInt(userId) : null,
        optionalAmenities: {
          create: optionalAmenitiesToCreate,
        },
        rentalAmenities: {
          create: rentalAmenitiesToCreate,
        },
        cottage: {
          create: cottageToCreate,
        },
      },
      include: {
        room: true,
        optionalAmenities: { include: { optionalAmenity: true } },
        rentalAmenities: { include: { rentalAmenity: true } },
        cottage: { include: { cottage: true } },
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error('Create Booking Error:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
