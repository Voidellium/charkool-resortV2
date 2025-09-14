import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ✅ GET single category
export async function GET(req, { params }) {
  try {
    const category = await prisma.amenityCategory.findUnique({
      where: { id: parseInt(params.id, 10) },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error('GET category error:', error);
    return NextResponse.json({ error: 'Failed to fetch category.' }, { status: 500 });
  }
}

// ✅ UPDATE category
export async function PUT(req, { params }) {
  try {
    const data = await req.json();
    const category = await prisma.amenityCategory.update({
      where: { id: parseInt(params.id, 10) },
      data: { name: data.name },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error('PUT category error:', error);
    return NextResponse.json({ error: 'Failed to update category.' }, { status: 500 });
  }
}

// ✅ DELETE category
export async function DELETE(req, { params }) {
  try {
    await prisma.amenityCategory.delete({
      where: { id: parseInt(params.id, 10) },
    });
    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('DELETE category error:', error);
    return NextResponse.json({ error: 'Failed to delete category.' }, { status: 500 });
  }
}
