import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let whereClause = {};
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Aggregate data
    const totalRevenue = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { ...whereClause, status: 'paid' },
    });

    const totalTransactions = await prisma.payment.count({
      where: whereClause,
    });

    const paidTransactions = await prisma.payment.count({
      where: { ...whereClause, status: 'paid' },
    });

    const pendingTransactions = await prisma.payment.count({
      where: { ...whereClause, status: 'pending' },
    });

    const failedTransactions = await prisma.payment.count({
      where: { ...whereClause, status: 'failed' },
    });

    const refundedTransactions = await prisma.payment.count({
      where: { ...whereClause, status: 'refunded' },
    });

    // Revenue by provider
    const revenueByProvider = await prisma.payment.groupBy({
      by: ['provider'],
      _sum: { amount: true },
      where: { ...whereClause, status: 'paid' },
    });

    // Monthly revenue (last 12 months)
    const monthlyRevenue = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        SUM(amount) as revenue
      FROM Payment
      WHERE status = 'paid' AND "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
    `;

    return NextResponse.json({
      totalRevenue: totalRevenue._sum.amount || 0,
      totalTransactions,
      paidTransactions,
      pendingTransactions,
      failedTransactions,
      refundedTransactions,
      revenueByProvider,
      monthlyRevenue,
    });
  } catch (error) {
    console.error('Reports Error:', error);
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 });
  }
}
