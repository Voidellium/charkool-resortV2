import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { canAccessReceptionApis } from '@/src/lib/cashierStaffAuth';

export async function GET(request) {
  try {
    const session = await getServerSession();
    
    if (!session || !canAccessReceptionApis(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all bookings with related data and unit assignments
    const bookings = await prisma.booking.findMany({
      where: {
        status: {
          not: 'Cancelled'
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        rooms: {
          include: {
            room: true
          }
        },
        payments: true,
        unitAssignments: {
          include: {
            room: true,
            metadata: true
          }
        }
      },
      orderBy: {
        checkIn: 'asc'
      }
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
