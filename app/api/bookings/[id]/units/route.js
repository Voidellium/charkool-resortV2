/**
 * API Route: Manage Unit Assignments for a Booking
 * 
 * GET /api/bookings/[id]/units - Get unit assignments
 * POST /api/bookings/[id]/units - Assign a unit (receptionist)
 * PUT /api/bookings/[id]/units - Reassign a unit (receptionist)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  getBookingUnitAssignments, 
  assignRoomUnit, 
  reassignRoomUnit 
} from '@/lib/roomUnitAvailability';
import { canAccessReceptionApis } from '@/src/lib/cashierStaffAuth';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const assignments = await getBookingUnitAssignments(parseInt(id));

    return NextResponse.json({
      success: true,
      bookingId: parseInt(id),
      assignments
    });

  } catch (error) {
    console.error('Error fetching booking unit assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unit assignments', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    
    if (!session || !canAccessReceptionApis(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { roomId, unitNumber } = body;

    if (!id || !roomId || !unitNumber) {
      return NextResponse.json(
        { error: 'Booking ID, Room ID, and Unit Number are required' },
        { status: 400 }
      );
    }

    const assignment = await assignRoomUnit(
      parseInt(id),
      roomId,
      parseInt(unitNumber),
      parseInt(session.user.id)
    );

    return NextResponse.json({
      success: true,
      message: 'Unit assigned successfully',
      assignment
    });

  } catch (error) {
    console.error('Error assigning unit:', error);
    return NextResponse.json(
      { error: 'Failed to assign unit', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession();
    
    if (!session || !canAccessReceptionApis(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { roomId, oldUnitNumber, newUnitNumber } = body;

    if (!id || !roomId || !oldUnitNumber || !newUnitNumber) {
      return NextResponse.json(
        { error: 'Booking ID, Room ID, Old Unit Number, and New Unit Number are required' },
        { status: 400 }
      );
    }

    const assignment = await reassignRoomUnit(
      parseInt(id),
      roomId,
      parseInt(oldUnitNumber),
      parseInt(newUnitNumber),
      parseInt(session.user.id)
    );

    return NextResponse.json({
      success: true,
      message: 'Unit reassigned successfully',
      assignment
    });

  } catch (error) {
    console.error('Error reassigning unit:', error);
    return NextResponse.json(
      { error: 'Failed to reassign unit', details: error.message },
      { status: 500 }
    );
  }
}
