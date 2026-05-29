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

    const {
      paymentId,
      action,
      note,
      flagReason,
      reason,
      newStatus,
      updates,
      newCashierId,
    } = await req.json();
    if (!paymentId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let payment = await prisma.payment.findUnique({ 
      where: { id: String(paymentId) }, 
      include: { booking: true } 
    });

    // Fallback: if caller passed bookingId instead of paymentId, resolve latest payment by booking.
    if (!payment && !isNaN(Number(paymentId))) {
      payment = await prisma.payment.findFirst({
        where: { bookingId: Number(paymentId) },
        include: { booking: true },
        orderBy: { createdAt: 'desc' },
      });
    }
    
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    let updateData = {};
    let updateBookingData = null;
    let auditAction = '';
    let auditDetails = { paymentId, bookingId: payment.bookingId };

    const ensureSupervisor = () => {
      if (role !== 'SUPERADMIN') {
        return NextResponse.json({ error: 'Supervisor action requires SUPERADMIN role' }, { status: 403 });
      }
      return null;
    };

    const addRemark = async (content) => {
      if (!content) return;
      await prisma.bookingRemark.create({
        data: {
          bookingId: payment.bookingId,
          authorId: session?.user?.id || null,
          authorRole: role,
          content,
        }
      });
    };

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

      case 'request_review':
        updateData = {
          verificationStatus: 'Flagged',
          flagReason: `REVIEW_REQUESTED: ${reason || flagReason || 'Requested by cashier for supervisor review'}`,
          verifiedById: session?.user?.id || null,
          verifiedAt: new Date(),
        };
        auditAction = 'REQUEST_PAYMENT_REVIEW';
        auditDetails.reason = reason || flagReason || null;
        await addRemark(`Payment Review Requested: ${reason || flagReason || 'No reason provided'}`);
        break;

      case 'start_investigation': {
        const guard = ensureSupervisor();
        if (guard) return guard;
        if (!reason) {
          return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
        }
        updateData = {
          verificationStatus: 'Flagged',
          flagReason: `UNDER_INVESTIGATION: ${reason}`,
          verifiedById: session?.user?.id || null,
          verifiedAt: new Date(),
        };
        auditAction = 'START_PAYMENT_INVESTIGATION';
        auditDetails.reason = reason;
        await addRemark(`Investigation Started: ${reason}`);
        break;
      }

      case 'clear_case': {
        const guard = ensureSupervisor();
        if (guard) return guard;
        if (!reason) {
          return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
        }
        updateData = {
          verificationStatus: 'Verified',
          flagReason: `CLEARED: ${reason}`,
          verifiedById: session?.user?.id || null,
          verifiedAt: new Date(),
        };
        auditAction = 'CLEAR_PAYMENT_CASE';
        auditDetails.reason = reason;
        await addRemark(`Case Cleared: ${reason}`);
        break;
      }

      case 'confirm_fraud': {
        const guard = ensureSupervisor();
        if (guard) return guard;
        if (!reason) {
          return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
        }
        updateData = {
          verificationStatus: 'Flagged',
          flagReason: `CONFIRMED_FRAUD: ${reason}`,
          verifiedById: session?.user?.id || null,
          verifiedAt: new Date(),
        };
        auditAction = 'CONFIRM_PAYMENT_FRAUD';
        auditDetails.reason = reason;
        await addRemark(`Fraud Confirmed: ${reason}`);
        break;
      }

      case 'unflag':
        updateData = {
          verificationStatus: 'Unverified',
          flagReason: null,
          verifiedById: null,
          verifiedAt: null,
        };
        auditAction = 'UNFLAG_PAYMENT';
        break;

      case 'unverify': {
        const guard = ensureSupervisor();
        if (guard) return guard;
        if (!reason) {
          return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
        }
        updateData = {
          verificationStatus: 'Unverified',
          flagReason: `UNVERIFIED: ${reason}`,
          verifiedById: null,
          verifiedAt: null,
        };
        auditAction = 'UNVERIFY_PAYMENT';
        auditDetails.reason = reason;
        await addRemark(`Payment Unverified: ${reason}`);
        break;
      }

      case 'override_status': {
        const guard = ensureSupervisor();
        if (guard) return guard;
        if (!newStatus || !reason) {
          return NextResponse.json({ error: 'newStatus and reason are required' }, { status: 400 });
        }

        const normalizedStatus = String(newStatus).trim().toLowerCase();
        const paymentStatusMap = {
          pending: 'Pending',
          paid: 'Paid',
          partial: 'Partial',
          reservation: 'Reservation',
          cancelled: 'Cancelled',
          refunded: 'Refunded',
        };

        if (!paymentStatusMap[normalizedStatus]) {
          return NextResponse.json({ error: 'Invalid status. Allowed: Pending, Paid, Partial, Reservation, Cancelled, Refunded' }, { status: 400 });
        }

        const finalStatus = paymentStatusMap[normalizedStatus];
        updateData = {
          status: finalStatus,
        };

        // Keep booking payment status in sync with the override.
        updateBookingData = {
          paymentStatus: finalStatus,
        };

        if (finalStatus === 'Cancelled') {
          updateBookingData.status = 'Cancelled';
        } else if (['Paid', 'Partial', 'Reservation'].includes(finalStatus) && ['Pending', 'Held'].includes(payment.booking?.status)) {
          updateBookingData.status = 'Confirmed';
        }

        auditAction = 'OVERRIDE_PAYMENT_STATUS';
        auditDetails.reason = reason;
        auditDetails.oldStatus = payment.status;
        auditDetails.newStatus = finalStatus;
        await addRemark(`Payment Status Overridden: ${payment.status} -> ${finalStatus}. Reason: ${reason}`);
        break;
      }

      case 'edit_metadata': {
        const guard = ensureSupervisor();
        if (guard) return guard;
        if (!updates || typeof updates !== 'object') {
          return NextResponse.json({ error: 'updates object is required' }, { status: 400 });
        }

        const allowed = ['method', 'provider', 'referenceId'];
        const safeUpdates = {};
        for (const key of allowed) {
          if (updates[key] !== undefined && updates[key] !== null && String(updates[key]).trim() !== '') {
            safeUpdates[key] = String(updates[key]).trim();
          }
        }

        if (Object.keys(safeUpdates).length === 0) {
          return NextResponse.json({ error: 'No valid metadata fields to update' }, { status: 400 });
        }

        updateData = safeUpdates;
        auditAction = 'EDIT_PAYMENT_METADATA';
        auditDetails.updates = safeUpdates;
        await addRemark(`Payment Metadata Updated: ${JSON.stringify(safeUpdates)}`);
        break;
      }

      case 'reassign_cashier': {
        const guard = ensureSupervisor();
        if (guard) return guard;
        if (!newCashierId || !reason) {
          return NextResponse.json({ error: 'newCashierId and reason are required' }, { status: 400 });
        }

        const cashier = await prisma.user.findUnique({ where: { id: parseInt(newCashierId, 10) } });
        if (!cashier || cashier.role !== 'CASHIER') {
          return NextResponse.json({ error: 'Target user is not a valid CASHIER' }, { status: 400 });
        }

        updateData = {
          verifiedById: cashier.id,
          verifiedAt: new Date(),
        };
        auditAction = 'REASSIGN_CASHIER';
        auditDetails.reason = reason;
        auditDetails.newCashierId = cashier.id;
        auditDetails.newCashierName = cashier.name || cashier.email || `Cashier #${cashier.id}`;
        await addRemark(`Cashier Reassigned: ${auditDetails.newCashierName}. Reason: ${reason}`);
        break;
      }

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

    if (updateBookingData && payment.bookingId) {
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: updateBookingData,
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
    if (action === 'flag' || action === 'request_review') {
      await prisma.notification.create({
        data: { 
          message: action === 'request_review'
            ? `Payment #${paymentId} was escalated for supervisor review`
            : `Payment #${paymentId} flagged for review`, 
          type: 'PAYMENT_FLAGGED', 
          role: 'SUPERADMIN', 
          bookingId: payment.bookingId 
        }
      });
    }

    if (['clear_case', 'confirm_fraud', 'unverify', 'override_status'].includes(action)) {
      await prisma.notification.create({
        data: {
          message: `Payment #${paymentId} review status updated by Super Admin`,
          type: 'PAYMENT_STATUS',
          role: 'CASHIER',
          bookingId: payment.bookingId,
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