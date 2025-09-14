import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// ✅ PUT — Update an amenity
export async function PUT(req, { params }) {
  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  try {
    const data = await req.json();
    const updated = await prisma.amenityInventory.update({
      where: { id },
      data: { name: data.name, quantity: Number(data.quantity) },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ error: 'Failed to update.' }, { status: 500 });
  }
}

// ✅ DELETE — Remove an amenity
export async function DELETE(_, { params }) {
  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  try {
    const existing = await prisma.amenityInventory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Amenity not found' }, { status: 404 });
    }

    const deleted = await prisma.amenityInventory.delete({ where: { id } });
    return NextResponse.json(deleted);
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete.' }, { status: 500 });
  }
}
