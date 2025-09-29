import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST: Calculate the total price for a selection of rooms and amenities
export async function POST(request) {
  try {
    const body = await request.json();
    const { selectedRooms = {}, optionalAmenities = {}, rentalAmenities = {}, cottage, nights = 1 } = body;

    let total = 0;

    // Calculate room costs
    if (Object.keys(selectedRooms).length > 0) {
      const roomIds = Object.keys(selectedRooms).map(id => parseInt(id));
      const roomDetails = await prisma.room.findMany({
        where: { id: { in: roomIds } },
      });

      for (const room of roomDetails) {
        const qty = selectedRooms[room.id] || 0;
        total += room.price * qty * nights;
      }
    }

    // Calculate rental amenities cost
    if (Object.keys(rentalAmenities).length > 0) {
      const rentalIds = Object.keys(rentalAmenities).map(id => parseInt(id));
      const rentalAmenityDetails = await prisma.rentalAmenity.findMany({
        where: { id: { in: rentalIds } },
      });

      for (const amenity of rentalAmenityDetails) {
        const selection = rentalAmenities[amenity.id];
        if (!selection) continue;

        const quantity = selection.quantity || 0;
        const hours = selection.hoursUsed || 0;

        if (hours > 0 && amenity.pricePerHour) {
          total += hours * amenity.pricePerHour;
        } else {
          total += quantity * amenity.pricePerUnit;
        }
      }
    }

    // Calculate cottage cost
    if (cottage && cottage.quantity > 0) {
      const cottageDetails = await prisma.cottage.findFirst(); // Assuming one type of cottage
      if (cottageDetails) {
        total += cottage.quantity * cottageDetails.price;
      }
    }

    // Optional amenities are typically free add-ons, so they don't add to the price.
    // If they were to have a price, the logic would be added here.

    return NextResponse.json({ totalPrice: total });

  } catch (error) {
    console.error('❌ Calculate Total POST Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
