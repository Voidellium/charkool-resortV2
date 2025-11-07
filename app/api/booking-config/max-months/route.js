import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch max booking months configuration (PUBLIC - no auth required)
export async function GET(req) {
  try {
    const config = await prisma.bookingDateConfiguration.findFirst({
      select: {
        maxBookingMonths: true,
      },
    });

    return NextResponse.json({
      maxBookingMonths: config?.maxBookingMonths || 2,
    });
  } catch (error) {
    console.error('Error fetching booking configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking configuration' },
      { status: 500 }
    );
  }
}
