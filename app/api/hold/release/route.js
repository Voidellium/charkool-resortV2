import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const POST = async (req) => {
  try {
    const now = new Date();

    // Find all Held and Pending bookings where heldUntil is in the past
    const expiredHolds = await prisma.booking.findMany({
      where: {
        status: {
          in: ['Held', 'Pending']
        },
        heldUntil: {
          lt: now,
        },
        // Exclude bookings that already have a reservation or are fully paid
        paymentStatus: { notIn: ['Reservation', 'Paid'] },
      },
    });

    if (expiredHolds.length === 0) {
      return NextResponse.json({ message: 'No expired holds to release' });
    }

    // Update expired holds to Cancelled
    const updateResult = await prisma.booking.updateMany({
      where: {
        status: {
          in: ['Held', 'Pending']
        },
        heldUntil: {
          lt: now,
        },
        paymentStatus: { notIn: ['Reservation', 'Paid'] },
      },
      data: {
        status: 'Cancelled',
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
