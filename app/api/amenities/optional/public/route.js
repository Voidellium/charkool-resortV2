import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const amenities = await prisma.optionalAmenity.findMany({
      where: {
        isActive: true,
        isPublicVisible: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        quantity: true,
        maxQuantity: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(amenities);
  } catch (error) {
    console.error('Failed to fetch public optional amenities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch amenities' },
      { status: 500 }
    );
  }
}
