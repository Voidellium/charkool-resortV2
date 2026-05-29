import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

// Function to serialize BigInt values for JSON response
function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

// GET completed transactions for a date window (default: last 30 days)
export const GET = async (req) => {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow CASHIER and SUPERADMIN roles
    if (!['CASHIER', 'SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const daysParam = parseInt(searchParams.get('days') || '30', 10);
    const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 365) : 30;

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    // Fetch payments that were verified/processed in range
    const completedPayments = await prisma.payment.findMany({
      where: {
        verificationStatus: 'Verified',
        verifiedAt: {
          gte: start,
          lte: now
        },
        status: {
          in: ['Paid', 'Partial']
        }
      },
      include: {
        booking: {
          include: {
            user: true,
            rooms: {
              include: {
                room: true
              }
            }
          }
        },
        verifiedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        verifiedAt: 'desc'
      }
    });

    // Transform to match the frontend expected format
    const transactions = completedPayments.map(payment => ({
      id: payment.receiptNumber || payment.id,
      paymentId: payment.id,
      guestName: payment.booking?.user?.name || payment.booking?.guestName || 'Guest',
      email: payment.booking?.user?.email || '',
      contact: payment.booking?.user?.contactNumber || '',
      amountRequired: Number(payment.booking?.totalPrice || payment.amount),
      amountPaid: Number(payment.amount),
      changeAmount: 0, // This would need to be stored if you want exact change
      paymentMethod: payment.method || payment.provider,
      referenceNo: payment.referenceId || '',
      bookingType: payment.booking?.paymentMode || 'Walk-in',
      processedBy: payment.verifiedBy?.name || 'Cashier',
      processedAt: payment.verifiedAt?.toISOString() || payment.createdAt.toISOString(),
      notes: '',
      transactionDate: payment.verifiedAt ? new Date(payment.verifiedAt).toISOString().split('T')[0] : new Date(payment.createdAt).toISOString().split('T')[0],
      originalPayment: {
        id: payment.booking?.id,
        bookingId: payment.bookingId,
        totalPrice: Number(payment.booking?.totalPrice || payment.amount)
      },
      completedAt: payment.verifiedAt || payment.createdAt
    }));

    return NextResponse.json(serializeBigInt(transactions));
  } catch (error) {
    console.error('❌ Completed Transactions GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
