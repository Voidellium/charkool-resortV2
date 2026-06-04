import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { recordAudit } from '@/src/lib/audit';
import { canAccessReceptionApis, getAuditWriteMeta } from '@/src/lib/cashierStaffAuth';

// POST: create a booking remark with role-based access control and audit logging
export async function POST(_req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!role || !canAccessReceptionApis(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const auditMeta = getAuditWriteMeta(role);
    const bookingId = Number(params.id);
    const body = await _req.json();
    const { content } = body || {};
    if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 });

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const remark = await prisma.bookingRemark.create({
      data: {
        bookingId,
        authorId: session?.user?.id || null,
        authorRole: auditMeta.actorRole,
        content,
      },
    });

    await recordAudit({
      actorId: session?.user?.id || null,
      actorName: session?.user?.name || session?.user?.email || 'System',
      actorRole: auditMeta.actorRole,
      action: 'CREATE',
      entity: 'BookingRemark',
      entityId: String(remark.id),
      details: JSON.stringify({ bookingId, content }),
    });

    return NextResponse.json({ success: true, remark });
  } catch (e) {
    console.error('Remark error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET: list remarks for this booking
export async function GET(_, { params }) {
  try {
    const remarks = await prisma.bookingRemark.findMany({
      where: { bookingId: parseInt(params.id) },
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(remarks);
  } catch (error) {
    console.error('Failed to fetch booking remarks', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}