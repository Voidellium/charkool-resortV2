/**
 * API Route: Get Available Room Units
 * 
 * Returns available unit numbers for a specific room and date range
 * 
 * GET /api/rooms/[id]/units/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
 */

import { NextResponse } from 'next/server';
import { getAvailableUnitsWithMetadata } from '@/lib/roomUnitAvailability';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');

    // Validation
    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'checkIn and checkOut dates are required' },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Validate dates
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (checkInDate >= checkOutDate) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }

    // Get available units with metadata
    const availableUnits = await getAvailableUnitsWithMetadata(
      parseInt(id),
      checkInDate,
      checkOutDate
    );

    return NextResponse.json({
      success: true,
      roomId: parseInt(id),
      checkIn,
      checkOut,
      availableUnits,
      totalAvailable: availableUnits.length
    });

  } catch (error) {
    console.error('Error fetching available units:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available units', details: error.message },
      { status: 500 }
    );
  }
}
