import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const { policies } = await request.json(); // Array of { id, order }

    if (!Array.isArray(policies)) {
      return NextResponse.json({ error: 'Invalid data format. Expected array of policies.' }, { status: 400 });
    }

    // Update orders in transaction
    await prisma.$transaction(
      policies.map(policy =>
        prisma.policy.update({
          where: { id: parseInt(policy.id) },
          data: { order: policy.order },
        })
      )
    );

    return NextResponse.json({ message: 'Policies reordered successfully' });
  } catch (error) {
    console.error('Reorder Policies Error:', error);
    return NextResponse.json({ error: 'Failed to reorder policies' }, { status: 500 });
  }
}
