import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET booking by ID
export const GET = async (_, context) => {
  try {
    const { id } = context.params;
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        room: true,
        user: true,
        amenities: { include: { amenity: true } },
        optionalAmenities: { include: { optionalAmenity: true } },
        rentalAmenities: { include: { rentalAmenity: true } },
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
export const PUT = async (req, context) => {
  try {
    const { id } = context.params;
    const data = await req.json();

    const updateData = {};

    if (data.guestName !== undefined) updateData.guestName = data.guestName;
    if (data.checkIn !== undefined) {
      const checkInDate = new Date(data.checkIn);
      if (isNaN(checkInDate.getTime())) {
        return NextResponse.json({ error: 'Invalid checkIn date' }, { status: 400 });
      }
      updateData.checkIn = checkInDate;
    }
    if (data.checkOut !== undefined) {
      const checkOutDate = new Date(data.checkOut);
      if (isNaN(checkOutDate.getTime())) {
        return NextResponse.json({ error: 'Invalid checkOut date' }, { status: 400 });
      }
      updateData.checkOut = checkOutDate;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
    if (data.totalPrice !== undefined) updateData.totalPrice = data.totalPrice;

    if (data.room !== undefined) {
      updateData.roomId = data.room.id;
    } else if (data.roomId !== undefined) {
      updateData.roomId = data.roomId;
    }

    // User is optional, only update if provided
    if (data.userId !== undefined) {
      updateData.userId = data.userId;
    }

    if (data.amenityIds !== undefined) {
      const amenityUpdates = {
        // Delete all existing amenities for this booking
        deleteMany: {},
        // Create new ones based on the provided IDs
        create: data.amenityIds.map((amenityId) => ({ amenityInventoryId: amenityId })),
      };
      updateData.amenities = amenityUpdates;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { amenities: { include: { amenity: true } } },
    });

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('❌ Booking PUT Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// DELETE booking
export const DELETE = async (_, context) => {
  try {
    const { id } = context.params;
    
    // First, delete all associated booking amenities
    await prisma.bookingAmenity.deleteMany({
      where: { bookingId: parseInt(id) },
    });

    // Then, delete the booking itself
    await prisma.booking.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Booking and associated amenities deleted' });
  } catch (error) {
    console.error('❌ Booking DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};