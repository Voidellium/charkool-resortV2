import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

// Function to serialize BigInt values for JSON response
function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

// GET cancelled transactions for today
export const GET = async (req) => {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow CASHIER and SUPERADMIN roles
    if (!['CASHIER', 'SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    
    // Default to today if no date provided
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    
    // Set to start and end of day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch bookings that were cancelled today
    const cancelledBookings = await prisma.booking.findMany({
      where: {
        status: 'Cancelled',
        updatedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        rooms: {
          include: {
            room: true
          }
        },
        user: true,
        payments: true,
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(serializeBigInt(cancelledBookings));
  } catch (error) {
    console.error('❌ Cancelled Transactions GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
