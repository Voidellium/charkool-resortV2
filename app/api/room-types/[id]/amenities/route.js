import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Get default amenities for a specific room type
export async function GET(request, { params }) {
  try {
    const id = params.id;

    // Validate room type
    const validRoomTypes = ['LOFT', 'TEPEE', 'VILLA', 'FAMILY_LODGE'];
    if (!validRoomTypes.includes(id)) {
      return NextResponse.json(
        { error: 'Invalid room type. Must be one of: LOFT, TEPEE, VILLA, FAMILY_LODGE' },
        { status: 400 }
      );
    }

    // Get default amenities for the room type
    const defaultAmenities = await prisma.roomTypeDefaultAmenity.findMany({
      where: {
        roomType: id,
        isActive: true,
      },
      orderBy: { amenityName: 'asc' },
    });

    return NextResponse.json(defaultAmenities);
  } catch (error) {
    console.error('❌ Room Type Amenities GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
