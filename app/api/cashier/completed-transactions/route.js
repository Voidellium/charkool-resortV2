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

// GET completed transactions for today (processed by cashier)
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

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch payments that were verified/processed today by cashier
    const completedPayments = await prisma.payment.findMany({
      where: {
        verificationStatus: 'Verified',
        verifiedAt: {
          gte: today,
          lt: tomorrow
        },
        status: 'Paid'
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
