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

    // Calculate total price for amenities and adjust stock with deltas in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let totalAmenityPrice = 0;

      // Fetch existing selections to compute deltas
      const existing = await tx.booking.findUnique({
        where: { id: parseInt(id) },
        include: { optionalAmenities: true, rentalAmenities: true },
      });

      // Index existing by amenityId
      const prevOptional = new Map((existing?.optionalAmenities || []).map(o => [o.optionalAmenityId, o.quantity]));
      const prevRental = new Map((existing?.rentalAmenities || []).map(r => [r.rentalAmenityId, r.quantity]));

      // Optional: apply updates with stock checks
      if (optionalAmenities) {
        // Build desired map
        const nextOptional = new Map(optionalAmenities.map(o => [o.optionalAmenityId, o.quantity]));
        // For each desired, compute delta = next - prev
        for (const [amenityId, qty] of nextOptional.entries()) {
          const prevQty = prevOptional.get(amenityId) || 0;
          const delta = qty - prevQty;
          if (delta > 0) {
            const upd = await tx.optionalAmenity.updateMany({ where: { id: amenityId, quantity: { gte: delta } }, data: { quantity: { decrement: delta } } });
            if (upd.count === 0) throw new Error(`Insufficient stock for optional amenity ID ${amenityId}`);
          } else if (delta < 0) {
            await tx.optionalAmenity.update({ where: { id: amenityId }, data: { quantity: { increment: Math.abs(delta) } } });
          }
        }
        // For removed items present in prev but not in next, return stock
        for (const [amenityId, prevQty] of prevOptional.entries()) {
          if (!nextOptional.has(amenityId)) {
            await tx.optionalAmenity.update({ where: { id: amenityId }, data: { quantity: { increment: prevQty } } });
          }
        }

        // Replace bookingOptionalAmenity rows
        await tx.bookingOptionalAmenity.deleteMany({ where: { bookingId: parseInt(id) } });
        for (const item of optionalAmenities) {
          const opt = await tx.optionalAmenity.findUnique({ where: { id: item.optionalAmenityId } });
          if (!opt) throw new Error(`Optional amenity with ID ${item.optionalAmenityId} not found`);
          if (item.quantity > opt.maxQuantity) throw new Error(`Quantity ${item.quantity} exceeds max ${opt.maxQuantity} for ${opt.name}`);
          await tx.bookingOptionalAmenity.create({ data: { bookingId: parseInt(id), optionalAmenityId: item.optionalAmenityId, quantity: item.quantity } });
        }
      }

      // Rental: apply updates with stock checks and recompute totals
      if (rentalAmenities) {
        const nextRental = new Map(rentalAmenities.map(r => [r.rentalAmenityId, r.quantity]));
        for (const [amenityId, qty] of nextRental.entries()) {
          const prevQty = prevRental.get(amenityId) || 0;
          const delta = qty - prevQty;
          if (delta > 0) {
            const upd = await tx.rentalAmenity.updateMany({ where: { id: amenityId, quantity: { gte: delta } }, data: { quantity: { decrement: delta } } });
            if (upd.count === 0) throw new Error(`Insufficient stock for rental amenity ID ${amenityId}`);
          } else if (delta < 0) {
            await tx.rentalAmenity.update({ where: { id: amenityId }, data: { quantity: { increment: Math.abs(delta) } } });
          }
        }
        for (const [amenityId, prevQty] of prevRental.entries()) {
          if (!nextRental.has(amenityId)) {
            await tx.rentalAmenity.update({ where: { id: amenityId }, data: { quantity: { increment: prevQty } } });
          }
        }

        await tx.bookingRentalAmenity.deleteMany({ where: { bookingId: parseInt(id) } });
        for (const item of rentalAmenities) {
          const rentalAmenity = await tx.rentalAmenity.findUnique({ where: { id: item.rentalAmenityId } });
          if (!rentalAmenity) throw new Error(`Rental amenity with ID ${item.rentalAmenityId} not found`);
          const perHour = Number(rentalAmenity.pricePerHour || 0);
          const perUnit = Number(rentalAmenity.pricePerUnit || 0);
          const calculatedPrice = item.hoursUsed ? (item.hoursUsed * (perHour || perUnit)) : (item.quantity * perUnit);
          totalAmenityPrice += calculatedPrice;
          await tx.bookingRentalAmenity.create({
            data: {
              bookingId: parseInt(id),
              rentalAmenityId: item.rentalAmenityId,
              quantity: item.quantity,
              hoursUsed: item.hoursUsed,
              totalPrice: calculatedPrice,
            },
          });
        }
      }

      // Update cottage selections (no stock management here)
      if (cottage !== undefined) {
        await tx.bookingCottage.deleteMany({ where: { bookingId: parseInt(id) } });
        if (cottage.cottageId && cottage.quantity > 0) {
          const cottageData = await tx.cottage.findUnique({ where: { id: cottage.cottageId } });
          if (!cottageData) throw new Error(`Cottage with ID ${cottage.cottageId} not found`);
          const cottagePrice = cottage.quantity * cottageData.price;
          totalAmenityPrice += cottagePrice;
          await tx.bookingCottage.create({ data: { bookingId: parseInt(id), cottageId: cottage.cottageId, quantity: cottage.quantity, totalPrice: cottagePrice } });
        }
      }

      return { totalAmenityPrice };
    });

    return NextResponse.json({ message: 'Amenities updated successfully', totalAmenityPrice: result.totalAmenityPrice });
  } catch (error) {
    console.error('❌ Booking Amenities PUT Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
