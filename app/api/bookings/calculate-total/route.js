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
      const roomIds = [...new Set(rooms.map(r => parseInt(r.roomId)))];
      const roomDetails = await prisma.room.findMany({
        where: { id: { in: roomIds } },
      });

      // Group rooms by roomId and count instances
      const roomGroups = {};
      for (const roomSelection of rooms) {
        const roomId = parseInt(roomSelection.roomId);
        if (!roomGroups[roomId]) {
          roomGroups[roomId] = [];
        }
        roomGroups[roomId].push(roomSelection);
      }

      // Calculate costs for each room type
      for (const [roomId, instances] of Object.entries(roomGroups)) {
        const room = roomDetails.find(r => r.id === parseInt(roomId));
        if (!room) continue;

        const qty = instances.length;
        const price = typeof room.price === 'bigint' ? Number(room.price) : room.price;
        
        // Room base cost (price × quantity × nights)
        total += price * qty * nights;
        
        // Additional pax fee (₱400 per pax per night)
        for (const instance of instances) {
          const additionalPax = instance.additionalPax || 0;
          total += additionalPax * 40000 * nights; // 40000 cents = ₱400 per night
        }
      }

      // Aggregate all rental amenities from rooms (if stored per room) OR use top-level rentalAmenities
      const aggregatedRentals = {};
      
      // Check if rental amenities are in rooms array
      let hasRoomLevelRentals = false;
      for (const roomSelection of rooms) {
        if (roomSelection.rentalAmenities && Object.keys(roomSelection.rentalAmenities).length > 0) {
          hasRoomLevelRentals = true;
          for (const [amenityId, selection] of Object.entries(roomSelection.rentalAmenities)) {
            if (!aggregatedRentals[amenityId]) {
              aggregatedRentals[amenityId] = { quantity: 0, hoursUsed: selection.hoursUsed || 0 };
            }
            aggregatedRentals[amenityId].quantity += selection.quantity || 0;
          }
        }
      }

      // If no room-level rentals, use top-level rentalAmenities (backward compatibility)
      if (!hasRoomLevelRentals && rentalAmenities && Object.keys(rentalAmenities).length > 0) {
        for (const [amenityId, selection] of Object.entries(rentalAmenities)) {
          aggregatedRentals[amenityId] = {
            quantity: selection.quantity || 0,
            hoursUsed: selection.hoursUsed || 0
          };
        }
      }

      // Calculate rental amenity costs
      if (Object.keys(aggregatedRentals).length > 0) {
        const rentalIds = Object.keys(aggregatedRentals).map(id => parseInt(id));
        const rentalDetails = await prisma.rentalAmenity.findMany({
          where: { id: { in: rentalIds } },
        });

        for (const amenity of rentalDetails) {
          const selection = aggregatedRentals[amenity.id];
          if (!selection) continue;

          const quantity = selection.quantity || 0;
          const hours = selection.hoursUsed || 0;

          if (hours > 0 && amenity.pricePerHour) {
            total += hours * amenity.pricePerHour * quantity;
          } else {
            total += quantity * amenity.pricePerUnit;
          }
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
