import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// ✅ GET all amenities
export async function GET() {
  try {
    const amenities = await prisma.amenityInventory.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(amenities);
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

    return NextResponse.json(created);
  } catch (error) {
    console.error('POST amenities error:', error);
    return NextResponse.json(
      { error: 'Failed to add inventory.' },
      { status: 500 }
    );
  }
}
