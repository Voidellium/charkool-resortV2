import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Get all amenities for a specific booking
export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Get the booking with all its amenities
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        optionalAmenities: {
          include: { optionalAmenity: true }
        },
        rentalAmenities: {
          include: { rentalAmenity: true }
        },
        cottage: {
          include: { cottage: true }
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Structure the response
    const amenities = {
      optional: booking.optionalAmenities.map(ba => ({
        id: ba.id,
        name: ba.optionalAmenity.name,
        description: ba.optionalAmenity.description,
        quantity: ba.quantity,
        maxQuantity: ba.optionalAmenity.maxQuantity,
      })),
      rental: booking.rentalAmenities.map(ba => ({
        id: ba.id,
        name: ba.rentalAmenity.name,
        description: ba.rentalAmenity.description,
        quantity: ba.quantity,
        hoursUsed: ba.hoursUsed,
        totalPrice: ba.totalPrice,
        pricePerUnit: ba.rentalAmenity.pricePerUnit,
        unitType: ba.rentalAmenity.unitType,
      })),
      cottage: booking.cottage.map(bc => ({
        id: bc.id,
        name: bc.cottage.name,
        quantity: bc.quantity,
        totalPrice: bc.totalPrice,
        price: bc.cottage.price,
      })),
    };

    return NextResponse.json(amenities);
  } catch (error) {
    console.error('❌ Booking Amenities GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update amenities for a specific booking
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { optionalAmenities, rentalAmenities, cottage } = body;

    // Check if booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Calculate total price for amenities
    let totalAmenityPrice = 0;

    // Update optional amenities
    if (optionalAmenities) {
      // Delete existing optional amenities
      await prisma.bookingOptionalAmenity.deleteMany({
        where: { bookingId: parseInt(id) },
      });

      // Create new optional amenities
      for (const amenity of optionalAmenities) {
        const optionalAmenity = await prisma.optionalAmenity.findUnique({
          where: { id: amenity.optionalAmenityId },
        });

        if (!optionalAmenity) {
          return NextResponse.json(
            { error: `Optional amenity with ID ${amenity.optionalAmenityId} not found` },
            { status: 400 }
          );
        }

        if (amenity.quantity > optionalAmenity.maxQuantity) {
          return NextResponse.json(
            { error: `Quantity ${amenity.quantity} exceeds maximum allowed ${optionalAmenity.maxQuantity} for ${optionalAmenity.name}` },
            { status: 400 }
          );
        }

        await prisma.bookingOptionalAmenity.create({
          data: {
            bookingId: parseInt(id),
            optionalAmenityId: amenity.optionalAmenityId,
            quantity: amenity.quantity,
          },
        });
      }
    }

    // Update rental amenities
    if (rentalAmenities) {
      // Delete existing rental amenities
      await prisma.bookingRentalAmenity.deleteMany({
        where: { bookingId: parseInt(id) },
      });

      // Create new rental amenities
      for (const amenity of rentalAmenities) {
        const rentalAmenity = await prisma.rentalAmenity.findUnique({
          where: { id: amenity.rentalAmenityId },
        });

        if (!rentalAmenity) {
          return NextResponse.json(
            { error: `Rental amenity with ID ${amenity.rentalAmenityId} not found` },
            { status: 400 }
          );
        }

        const calculatedPrice = amenity.hoursUsed
          ? amenity.hoursUsed * (rentalAmenity.pricePerHour || rentalAmenity.pricePerUnit)
          : amenity.quantity * rentalAmenity.pricePerUnit;

        totalAmenityPrice += calculatedPrice;

        await prisma.bookingRentalAmenity.create({
          data: {
            bookingId: parseInt(id),
            rentalAmenityId: amenity.rentalAmenityId,
            quantity: amenity.quantity,
            hoursUsed: amenity.hoursUsed,
            totalPrice: calculatedPrice,
          },
        });
      }
    }

    // Update cottage
    if (cottage !== undefined) {
      // Delete existing cottage
      await prisma.bookingCottage.deleteMany({
        where: { bookingId: parseInt(id) },
      });

      // Create new cottage if specified
      if (cottage.cottageId && cottage.quantity > 0) {
        const cottageData = await prisma.cottage.findUnique({
          where: { id: cottage.cottageId },
        });

        if (!cottageData) {
          return NextResponse.json(
            { error: `Cottage with ID ${cottage.cottageId} not found` },
            { status: 400 }
          );
        }

        const cottagePrice = cottage.quantity * cottageData.price;
        totalAmenityPrice += cottagePrice;

        await prisma.bookingCottage.create({
          data: {
            bookingId: parseInt(id),
            cottageId: cottage.cottageId,
            quantity: cottage.quantity,
            totalPrice: cottagePrice,
          },
        });
      }
    }

    return NextResponse.json({
      message: 'Amenities updated successfully',
      totalAmenityPrice,
    });
  } catch (error) {
    console.error('❌ Booking Amenities PUT Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
