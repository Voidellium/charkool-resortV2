import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET usage logs for optional amenities with booking and customer info
export async function GET() {
  try {
    // Fetch booking optional amenities with related booking and user info
    const usageLogs = await prisma.bookingOptionalAmenity.findMany({
      where: {
        booking: {
          checkOut: {
            gte: new Date(), // Include active and future bookings
          },
        },
      },
      include: {
        optionalAmenity: true,
        booking: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        booking: {
          checkIn: 'desc',
        },
      },
    });

    // Map to desired response format
    const logs = usageLogs.map((log) => ({
      name: log.optionalAmenity.name,
      quantityUsed: log.quantity,
      usedIn: log.booking.user ? `${log.booking.user.firstName} ${log.booking.user.lastName}` : 'Unknown',
      heldUpon: log.booking.checkIn.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      heldUntil: log.booking.checkOut.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    return NextResponse.json(logs);
  } catch (error) {
    console.error('GET usage logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage logs.' },
      { status: 500 }
    );
  }
}
