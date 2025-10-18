import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { recordAudit } from '@/src/lib/audit';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!role || (role !== 'CASHIER' && role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { paymentId, reason } = await req.json();
    if (!paymentId || !reason) return NextResponse.json({ error: 'Missing paymentId or reason' }, { status: 400 });

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: { verificationStatus: 'Flagged', flagReason: reason }
    });

    await prisma.notification.create({
      data: { message: `Payment flagged for Booking #${payment.bookingId}: ${reason}`, type: 'PAYMENT_FLAGGED', role: 'SUPERADMIN', bookingId: payment.bookingId }
    });

    await recordAudit({
      actorId: session?.user?.id || null,
      actorName: session?.user?.name || session?.user?.email || 'System',
      actorRole: role,
      action: 'FLAG',
      entity: 'Payment',
      entityId: String(paymentId),
      details: JSON.stringify({ reason })
    });

    return NextResponse.json({ success: true, payment: { id: updated.id, verificationStatus: updated.verificationStatus, flagReason: updated.flagReason } });
  } catch (e) {
    console.error('Flag error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
