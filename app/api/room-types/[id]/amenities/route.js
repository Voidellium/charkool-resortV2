import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Get default amenities for a specific room type
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const roomType = id.toUpperCase(); // e.g., 'LOFT', 'VILLA'

    // Get default amenities for the given room type
    const defaultAmenities = await prisma.roomTypeDefaultAmenity.findMany({
      where: {
        roomType: roomType, // Use the validated room type
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