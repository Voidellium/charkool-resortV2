import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const POST = async (req) => {
  try {
    const now = new Date();

    // Find all HELD bookings where heldUntil is in the past
    const expiredHolds = await prisma.booking.findMany({
      where: {
        status: 'HELD',
        heldUntil: {
          lt: now,
        },
      },
    });

    if (expiredHolds.length === 0) {
      return NextResponse.json({ message: 'No expired holds to release' });
    }

    // Update expired holds to CANCELLED or delete them
    const updateResult = await prisma.booking.updateMany({
      where: {
        status: 'HELD',
        heldUntil: {
          lt: now,
        },
      },
      data: {
        status: 'CANCELLED',
        heldUntil: null,
      },
    });

    return NextResponse.json({
      message: `Released ${updateResult.count} expired holds`,
      releasedBookings: expiredHolds.map(b => b.id),
    });
  } catch (error) {
    console.error('❌ Release Holds Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
