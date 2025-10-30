import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST: Calculate the total price for a selection of rooms and amenities
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Support both old format (selectedRooms object) and new format (rooms array)
    const { 
      selectedRooms = {}, 
      rooms = [], // NEW: array of room objects with details
      optionalAmenities = {}, 
      rentalAmenities = {}, 
      cottage, 
      nights = 1 
    } = body;

    let total = 0;

    // NEW FORMAT: Calculate room costs from rooms array
    if (rooms && rooms.length > 0) {
      const roomIds = rooms.map(r => parseInt(r.roomId));
      const roomDetails = await prisma.room.findMany({
        where: { id: { in: roomIds } },
      });

      for (const roomSelection of rooms) {
        const room = roomDetails.find(r => r.id === parseInt(roomSelection.roomId));
        if (!room) continue;

        const qty = roomSelection.quantity || 1;
        
        // Room base cost (price × nights)
        total += room.price * qty * nights;
        
        // Additional pax fee (₱400 per pax, one-time, not per night)
        const additionalPax = roomSelection.additionalPax || 0;
        total += additionalPax * 40000; // 40000 cents = ₱400

        // Rental amenities for this room
        if (roomSelection.rentalAmenities && Object.keys(roomSelection.rentalAmenities).length > 0) {
          const rentalIds = Object.keys(roomSelection.rentalAmenities).map(id => parseInt(id));
          const rentalDetails = await prisma.rentalAmenity.findMany({
            where: { id: { in: rentalIds } },
          });

          for (const amenity of rentalDetails) {
            const selection = roomSelection.rentalAmenities[amenity.id];
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

        // Optional amenities for this room (currently free, but structure for future pricing)
        if (roomSelection.optionalAmenities && Object.keys(roomSelection.optionalAmenities).length > 0) {
          // Optional amenities are free add-ons, so they don't add to the price currently
          // If they were to have a price in the future, the logic would be added here
        }
      }
    } 
    // OLD FORMAT: Calculate room costs (for backward compatibility)
    else if (Object.keys(selectedRooms).length > 0) {
      const roomIds = Object.keys(selectedRooms).map(id => parseInt(id));
      const roomDetails = await prisma.room.findMany({
        where: { id: { in: roomIds } },
      });

      for (const room of roomDetails) {
        const qty = selectedRooms[room.id] || 0;
        total += room.price * qty * nights;
      }

      // Calculate rental amenities cost (old format)
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
    }

    // Calculate cottage cost
    if (cottage && cottage.quantity > 0) {
      const cottageDetails = await prisma.cottage.findFirst();
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
