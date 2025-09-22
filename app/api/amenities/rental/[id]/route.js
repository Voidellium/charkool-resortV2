
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

// Helper to check for authorized roles
const isAuthorized = (role) => {
  return role === 'SUPERADMIN' || role === 'AMENITYINVENTORYMANAGER';
};

// PUT: Update a rental amenity
export async function PUT(request, { params }) {
  const token = await getToken({ req: request, secret: JWT_SECRET });

  if (!token || !isAuthorized(token.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id } = params;
    const body = await request.json();
    const { name, description, pricePerUnit, pricePerHour, unitType, isActive } = body;

    if (!name || !name.trim() || !pricePerUnit || !unitType || !unitType.trim()) {
      return NextResponse.json({ error: 'Missing required fields: name, pricePerUnit, unitType' }, { status: 400 });
    }

    const updatedAmenity = await prisma.rentalAmenity.update({
      where: { id: parseInt(id) },
      data: {
        name: name.trim(),
        description: description?.trim(),
        pricePerUnit: parseInt(pricePerUnit),
        pricePerHour: pricePerHour ? parseInt(pricePerHour) : null,
        unitType: unitType.trim(),
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
    });

    // Log the action
    await prisma.amenityLog.create({
      data: {
        action: 'UPDATE',
        amenityName: updatedAmenity.name,
        user: token.name || 'Unknown User',
      },
    });

    return NextResponse.json(updatedAmenity);
  } catch (error) {
    console.error('❌ Rental Amenity PUT Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Deactivate a rental amenity
export async function DELETE(request, { params }) {
  const token = await getToken({ req: request, secret: JWT_SECRET });

  if (!token || !isAuthorized(token.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id } = params;

    const updatedAmenity = await prisma.rentalAmenity.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    // Log the action
    await prisma.amenityLog.create({
      data: {
        action: 'DEACTIVATE',
        amenityName: updatedAmenity.name,
        user: token.name || 'Unknown User',
      },
    });

    return NextResponse.json({ message: 'Rental amenity deactivated' });
  } catch (error) {
    console.error('❌ Rental Amenity DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
