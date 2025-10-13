import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAudit } from '@/src/lib/audit';

import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

// Helper to check for authorized roles
const isAuthorized = (role) => {
  return role === 'SUPERADMIN' || role === 'AMENITYINVENTORYMANAGER';
};

// GET: Get all rental amenities
export async function GET() {
  try {
    const rentalAmenities = await prisma.rentalAmenity.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(rentalAmenities);
  } catch (error) {
    console.error('❌ Rental Amenities GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create a new rental amenity
export async function POST(request) {
  const token = await getToken({ req: request, secret: JWT_SECRET });

  if (!token || !isAuthorized(token.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, pricePerUnit, pricePerHour, unitType, unitNote } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!pricePerUnit || pricePerUnit <= 0) {
      return NextResponse.json(
        { error: 'Valid price per unit is required' },
        { status: 400 }
      );
    }

    if (!unitType || !unitType.trim()) {
      return NextResponse.json({ error: 'Unit type is required' }, { status: 400 });
    }

    // Check if amenity already exists
    const existingAmenity = await prisma.rentalAmenity.findUnique({
      where: { name: name.trim() },
    });

    if (existingAmenity) {
      return NextResponse.json(
        { error: 'Rental amenity with this name already exists' },
        { status: 409 }
      );
    }

    // Create the rental amenity
    const newAmenity = await prisma.rentalAmenity.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        pricePerUnit: parseInt(pricePerUnit),
        pricePerHour: pricePerHour ? parseInt(pricePerHour) : null,
        unitType: unitType.trim(),
        unitNote: unitNote?.trim() || null,
      },
    });

    // Log the action
    await prisma.amenityLog.create({
      data: {
        action: 'CREATE',
        amenityName: newAmenity.name,
        user: token.name || 'Unknown User',
      },
    });

    // Record audit
    try {
      await recordAudit({
        actorId: token?.sub ? parseInt(token.sub) : null,
        actorName: token?.name || token?.email || 'Unknown',
        actorRole: token?.role || 'ADMIN',
        action: 'CREATE',
        entity: 'RentalAmenity',
        entityId: String(newAmenity.id),
        details: `Created rental amenity "${newAmenity.name}"`,
      });
    } catch (auditErr) {
      console.error('Failed to record audit for rental amenity create', auditErr);
    }

    return NextResponse.json(newAmenity, { status: 201 });
  } catch (error) {
    console.error('❌ Rental Amenities POST Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
