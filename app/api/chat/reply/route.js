import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only Super Admin can reply
    if (!session || session.user?.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { escalationId, notes, status } = body;

    if (!escalationId) {
      return NextResponse.json(
        { error: 'Escalation ID required' },
        { status: 400 }
      );
    }

    // Update escalation with admin notes and mark as contacted
    const escalation = await prisma.chatEscalation.update({
      where: { id: escalationId },
      data: {
        status: status || 'contacted',
        notes,
        contactedAt: status === 'contacted' ? new Date() : undefined,
        contactedBy: parseInt(session.user.id)
      },
      include: {
        user: true
      }
    });

    return NextResponse.json({ success: true, escalation });
  } catch (error) {
    console.error('Failed to update escalation:', error);
    return NextResponse.json(
      { error: 'Failed to update escalation' },
      { status: 500 }
    );
  }
}
