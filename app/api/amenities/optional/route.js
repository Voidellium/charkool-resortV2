import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAudit } from '@/src/lib/audit';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

// Helper to check for authorized roles
const isAuthorized = (role) => {
  return role === 'SUPERADMIN' || role === 'AMENITYINVENTORYMANAGER';
};

// GET: Get all optional amenities
export async function GET() {
  try {
    const optionalAmenities = await prisma.optionalAmenity.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(optionalAmenities);
  } catch (error) {
    console.error('❌ Optional Amenities GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create a new optional amenity
export async function POST(request) {
  const token = await getToken({ req: request, secret: JWT_SECRET });

  if (!token || !isAuthorized(token.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, maxQuantity = 1 } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if amenity already exists
    const existingAmenity = await prisma.optionalAmenity.findUnique({
      where: { name: name.trim() },
    });

    if (existingAmenity) {
      return NextResponse.json(
        { error: 'Optional amenity with this name already exists' },
        { status: 409 }
      );
    }

    // Create the optional amenity
    const newAmenity = await prisma.optionalAmenity.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        maxQuantity: Math.max(1, parseInt(maxQuantity) || 1),
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

    // Record audit trail
    try {
      await recordAudit({
        actorId: token?.sub ? parseInt(token.sub) : null,
        actorName: token?.name || token?.email || 'Unknown',
        actorRole: token?.role || 'ADMIN',
        action: 'CREATE',
        entity: 'OptionalAmenity',
        entityId: String(newAmenity.id),
        details: `Created optional amenity "${newAmenity.name}"`,
      });
    } catch (auditErr) {
      console.error('Failed to record audit for optional amenity create', auditErr);
    }

    return NextResponse.json(newAmenity, { status: 201 });
  } catch (error) {
    console.error('❌ Optional Amenities POST Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
