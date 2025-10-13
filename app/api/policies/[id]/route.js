import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAudit } from '@/src/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

// Helper function to serialize BigInt values
function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const policy = await prisma.policy.findUnique({
      where: { id: parseInt(id) },
    });
    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }
    return NextResponse.json(serializeBigInt(policy));
  } catch (error) {
    console.error('Fetch Policy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch policy' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const { title, content, order, isActive } = await request.json();

    const updateData = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    const policy = await prisma.policy.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // Audit update
    try {
      const session = await getServerSession(authOptions);
      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || session?.user?.email || 'Unknown',
        actorRole: session?.user?.role || 'ADMIN',
        action: 'UPDATE',
        entity: 'Policy',
        entityId: String(policy.id),
        details: `Updated policy "${policy.title}"`,
      });
    } catch (auditErr) {
      console.error('Policy update audit failed', auditErr);
    }

    return NextResponse.json(serializeBigInt(policy));
  } catch (error) {
    console.error('Update Policy Error:', error);
    return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const policy = await prisma.policy.findUnique({ where: { id: parseInt(id) } });
    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    await prisma.policy.delete({
      where: { id: parseInt(id) },
    });

    // Audit delete
    try {
      const session = await getServerSession(authOptions);
      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || session?.user?.email || 'Unknown',
        actorRole: session?.user?.role || 'ADMIN',
        action: 'DELETE',
        entity: 'Policy',
        entityId: String(id),
        details: `Deleted policy id ${id}`,
      });
    } catch (auditErr) {
      console.error('Policy delete audit failed', auditErr);
    }

    return NextResponse.json({ message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('Delete Policy Error:', error);
    return NextResponse.json({ error: 'Failed to delete policy' }, { status: 500 });
  }
}
