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

    const { paymentId, note } = await req.json();
    if (!paymentId) return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 });

    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { booking: true } });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        verificationStatus: 'Verified',
        verifiedById: session?.user?.id || null,
        verifiedAt: new Date(),
      }
    });

    // optional remark
    if (note) {
      await prisma.bookingRemark.create({
        data: {
          bookingId: payment.bookingId,
          authorId: session?.user?.id || null,
          authorRole: role,
          content: note,
        }
      });
    }

    // notifications: receptionist + superadmin
    await prisma.notification.create({
      data: { message: `Payment verified for Booking #${payment.bookingId}`, type: 'PAYMENT_VERIFIED', role: 'RECEPTIONIST', bookingId: payment.bookingId }
    });
    await prisma.notification.create({
      data: { message: `Payment verified for Booking #${payment.bookingId}`, type: 'PAYMENT_VERIFIED', role: 'SUPERADMIN', bookingId: payment.bookingId }
    });

    await recordAudit({
      actorId: session?.user?.id || null,
      actorName: session?.user?.name || session?.user?.email || 'System',
      actorRole: role,
      action: 'VERIFY',
      entity: 'Payment',
      entityId: String(paymentId),
      details: JSON.stringify({ paymentId, bookingId: payment.bookingId })
    });

    return NextResponse.json({ success: true, payment: { id: updated.id, verificationStatus: updated.verificationStatus } });
  } catch (e) {
    console.error('Verify error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
