import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ✅ GET all categories
export async function GET() {
  try {
    const categories = await prisma.amenityCategory.findMany();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('GET categories error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories.' }, { status: 500 });
  }
}

// ✅ POST new category
export async function POST(req) {
  try {
    const data = await req.json();
    if (!data.name) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }

    const category = await prisma.amenityCategory.create({
      data: { name: data.name.trim() },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('POST categories error:', error);
    return NextResponse.json({ error: 'Failed to create category.' }, { status: 500 });
  }
}
