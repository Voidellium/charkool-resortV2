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

    const roomId = parseInt(id);
    if (isNaN(roomId)) {
      return NextResponse.json(
        { error: 'Invalid room ID' },
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
      roomId,
      checkInDate,
      checkOutDate
    );

    return NextResponse.json({
      success: true,
      roomId,
      checkIn,
      checkOut,
      availableUnits,
      totalAvailable: availableUnits.length
    });

  } catch (error) {
    console.error('Error fetching available units:', error);
    // Return empty array instead of error for graceful degradation
    // This allows the booking flow to continue even if unit selection isn't available
    return NextResponse.json({
      success: true,
      availableUnits: [],
      totalAvailable: 0,
      warning: 'Unable to fetch unit data'
    });
  }
}
