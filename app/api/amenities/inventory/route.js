import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// ✅ GET all optional amenities with calculated available quantity
export async function GET() {
  try {
    // Fetch all active optional amenities
    const optionalAmenities = await prisma.optionalAmenity.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // For each optional amenity, calculate quantity available = default quantity - sum of quantities used in active bookings
    const amenitiesWithQuantity = await Promise.all(
      optionalAmenities.map(async (amenity) => {
        // Sum quantities used in bookings where booking.checkOut is in the future (active bookings)
        const usedQuantityResult = await prisma.bookingOptionalAmenity.aggregate({
          _sum: {
            quantity: true,
          },
          where: {
            optionalAmenityId: amenity.id,
            booking: {
              checkOut: {
                gt: new Date(),
              },
            },
          },
        });

        const usedQuantity = usedQuantityResult._sum.quantity || 0;
        const availableQuantity = Math.max(
          0,
          50 - usedQuantity
        );

        return {
          name: amenity.name,
          category: 'Optional amenity',
          quantity: availableQuantity,
        };
      })
    );

    return NextResponse.json(amenitiesWithQuantity);
  } catch (error) {
    console.error('GET amenities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch amenities.' },
      { status: 500 }
    );
  }
}

// ✅ POST — Add a new amenity
export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.name || body.quantity == null) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      );
    }

    const created = await prisma.amenityInventory.create({
      data: {
        name: body.name.trim(),
        quantity: parseInt(body.quantity, 10),
      },
    });

    // Create notification for superadmin
    try {
      await prisma.notification.create({
        data: {
          message: `New amenity added: ${created.name} (Quantity: ${created.quantity})`,
          type: 'amenity_added',
          role: 'superadmin',
        },
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    return NextResponse.json(created);
  } catch (error) {
    console.error('POST amenities error:', error);
    return NextResponse.json(
      { error: 'Failed to add inventory.' },
      { status: 500 }
    );
  }
}
