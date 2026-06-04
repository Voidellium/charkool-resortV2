import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateRentalAmenityTotalCents } from '@/src/lib/rentalPricing';

function normalizePromotionId(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function computeDiscountAmount(baseTotal, promotion) {
  if (!promotion || baseTotal <= 0) return 0;
  if (promotion.discountType === 'percentage') {
    const percent = Number(promotion.discountValue) / 10000;
    return Math.min(baseTotal, Math.round(baseTotal * percent));
  }
  if (promotion.discountType === 'fixed') {
    return Math.min(baseTotal, Number(promotion.discountValue) || 0);
  }
  return 0;
}

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
      nights = 1,
      promotionId = null
    } = body;

    let total = 0;
let rentalTotal = 0;


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

          const amenityCost = calculateRentalAmenityTotalCents({
            quantity: selection.quantity,
            hoursUsed: selection.hoursUsed,
            rentalAmenity: amenity,
          });
          total += amenityCost;
          rentalTotal += amenityCost;
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

          const amenityCost = calculateRentalAmenityTotalCents({
            quantity: selection.quantity,
            hoursUsed: selection.hoursUsed,
            rentalAmenity: amenity,
          });
          total += amenityCost;
          rentalTotal += amenityCost;
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

    let appliedPromotion = null;
    let discountAmount = 0;
    const normalizedPromotionId = normalizePromotionId(promotionId);

    if (normalizedPromotionId) {
      const promotion = await prisma.promotion.findUnique({
        where: { id: normalizedPromotionId }
      });

      const now = new Date();
      const isActive = promotion && promotion.isActive;
      const isWithinDates = promotion && promotion.startDate <= now && promotion.endDate >= now;
      const isBookingTarget = promotion && promotion.targetType === 'booking';

      if (!promotion || !isActive || !isWithinDates || !isBookingTarget) {
        return NextResponse.json({ error: 'Selected promotion is not valid for this booking.' }, { status: 400 });
      }

      discountAmount = computeDiscountAmount(total, promotion);
      appliedPromotion = {
        id: promotion.id,
        title: promotion.title,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        targetType: promotion.targetType
      };
    }

    const finalTotal = Math.max(0, total - discountAmount);

    return NextResponse.json({
      totalPrice: finalTotal,
      baseTotal: total,
      rentalAmenityTotal: rentalTotal,
      discountAmount,
      finalTotal,
      appliedPromotion
    });

  } catch (error) {
    console.error('❌ Calculate Total POST Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
