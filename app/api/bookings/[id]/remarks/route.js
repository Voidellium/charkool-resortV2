import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { recordAudit } from '@/src/lib/audit';

export async function POST(_req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!role || !['CASHIER','SUPERADMIN','RECEPTIONIST'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
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
        authorRole: role,
        content,
      }
    });

    await recordAudit({
      actorId: session?.user?.id || null,
      actorName: session?.user?.name || session?.user?.email || 'System',
      actorRole: role,
      action: 'CREATE',
      entity: 'BookingRemark',
      entityId: String(remark.id),
      details: JSON.stringify({ bookingId, content })
    });

    return NextResponse.json({ success: true, remark });
  } catch (e) {
    console.error('Remark error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
