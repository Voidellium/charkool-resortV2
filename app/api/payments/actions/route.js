import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { recordAudit } from '@/src/lib/audit';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!role || !['CASHIER', 'SUPERADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { paymentId, action, note, flagReason } = await req.json();
    if (!paymentId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({ 
      where: { id: paymentId }, 
      include: { booking: true } 
    });
    
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    let updateData = {};
    let auditAction = '';
    let auditDetails = { paymentId, bookingId: payment.bookingId };

    switch (action) {
      case 'flag':
        updateData = {
          verificationStatus: 'Flagged',
          flagReason: flagReason || 'Flagged by admin',
          verifiedById: session?.user?.id || null,
          verifiedAt: new Date(),
        };
        auditAction = 'FLAG_PAYMENT';
        auditDetails.flagReason = flagReason;
        break;

      case 'unflag':
        updateData = {
          verificationStatus: 'Unverified',
          flagReason: null,
          verifiedById: null,
          verifiedAt: null,
        };
        auditAction = 'UNFLAG_PAYMENT';
        break;

      case 'add_note':
        if (!note) {
          return NextResponse.json({ error: 'Note is required' }, { status: 400 });
        }
        // Add note as booking remark
        await prisma.bookingRemark.create({
          data: {
            bookingId: payment.bookingId,
            authorId: session?.user?.id || null,
            authorRole: role,
            content: `Payment Note: ${note}`,
          }
        });
        auditAction = 'ADD_PAYMENT_NOTE';
        auditDetails.note = note;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update payment if needed
    if (Object.keys(updateData).length > 0) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: updateData
      });
    }

    // Add audit trail
    await recordAudit({
      actorId: session?.user?.id || null,
      actorName: session?.user?.name || session?.user?.email || 'System',
      actorRole: role,
      action: auditAction,
      entity: 'Payment',
      entityId: String(paymentId),
      details: JSON.stringify(auditDetails)
    });

    // Create notifications
    if (action === 'flag') {
      await prisma.notification.create({
        data: { 
          message: `Payment #${paymentId} flagged for review`, 
          type: 'PAYMENT_FLAGGED', 
          role: 'SUPERADMIN', 
          bookingId: payment.bookingId 
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Payment ${action} completed successfully` 
    });
  } catch (error) {
    console.error('Payment action error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}