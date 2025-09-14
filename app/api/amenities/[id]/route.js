import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ✅ PUT — Update an amenity
export async function PUT(req, { params }) {
  const data = await req.json();
  const updated = await prisma.amenity.update({
    where: { id: parseInt(params.id, 10) },
    data,
  });
  return NextResponse.json(updated);
}

// ✅ DELETE — Remove an amenity
export async function DELETE(_, { params }) {
  await prisma.amenity.delete({ where: { id: parseInt(params.id, 10) } });
  return NextResponse.json({ message: 'Deleted successfully' });
}
