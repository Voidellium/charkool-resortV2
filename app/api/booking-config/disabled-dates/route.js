import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch all disabled dates (PUBLIC - no auth required)
// This endpoint is used by booking calendars across all roles
export async function GET(req) {
  try {
    const disabledDates = await prisma.disabledBookingDate.findMany({
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
      },
    });

    return NextResponse.json(disabledDates);
  } catch (error) {
    console.error('Error fetching disabled dates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch disabled dates' },
      { status: 500 }
    );
  }
}
