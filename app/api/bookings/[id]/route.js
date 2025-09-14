// src/app/api/bookings/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET booking by ID
export const GET = async (_, { params }) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        room: true,
        user: true,
        amenities: { include: { amenity: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('❌ Booking GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// PUT update booking
export const PUT = async (req, { params }) => {
  try {
    const data = await req.json();

    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(params.id) },
      data: {
        guestName: data.guestName,
        checkIn: new Date(data.checkIn),
        checkOut: new Date(data.checkOut),
        status: data.status,
        paymentStatus: data.paymentStatus,
        totalPrice: data.totalPrice,
        roomId: data.roomId,
        userId: data.userId,
        amenities: {
          deleteMany: {},
          create: data.amenityIds?.map((id) => ({ amenityInventoryId: id })) || [],
        },
      },
      include: { amenities: { include: { amenity: true } } },
    });

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('❌ Booking PUT Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// DELETE booking
export const DELETE = async (_, { params }) => {
  try {
    await prisma.bookingAmenity.deleteMany({
      where: { bookingId: parseInt(params.id) },
    });

    await prisma.booking.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json({ message: 'Booking deleted' });
  } catch (error) {
    console.error('❌ Booking DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
