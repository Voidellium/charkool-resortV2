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

export async function GET() {
  try {
    const policies = await prisma.policy.findMany({
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(serializeBigInt(policies));
  } catch (error) {
    console.error('Fetch Policies Error:', error);
    return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { title, content, order, isActive } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Missing required fields: title and content' }, { status: 400 });
    }

    const policy = await prisma.policy.create({
      data: {
        title,
        content,
        order: order || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    // Record audit
    try {
      const session = await getServerSession(authOptions);
      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || session?.user?.email || 'Unknown',
        actorRole: session?.user?.role || 'ADMIN',
        action: 'CREATE',
        entity: 'Policy',
        entityId: String(policy.id),
        details: `Created policy "${policy.title}"`,
      });
    } catch (auditErr) {
      console.error('Policy create audit failed', auditErr);
    }

    return NextResponse.json(serializeBigInt(policy), { status: 201 });
  } catch (error) {
    console.error('Create Policy Error:', error);
    return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 });
  }
}
