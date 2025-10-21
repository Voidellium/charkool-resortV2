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

    // Monthly revenue (last 12 months) - Safe Prisma query
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const monthlyRevenue = await prisma.payment.groupBy({
      by: ['createdAt'],
      _sum: { amount: true },
      where: {
        status: 'paid',
        createdAt: {
          gte: twelveMonthsAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Format the monthly data
    const formattedMonthlyRevenue = monthlyRevenue.map(item => ({
      month: new Date(item.createdAt.getFullYear(), item.createdAt.getMonth(), 1).toISOString(),
      revenue: item._sum.amount || 0
    }));
    
    // Group by month and sum revenues
    const monthlyRevenueGrouped = formattedMonthlyRevenue.reduce((acc, item) => {
      const month = item.month;
      if (!acc[month]) {
        acc[month] = 0;
      }
      acc[month] += item.revenue;
      return acc;
    }, {});
    
    // Convert to array format
    const finalMonthlyRevenue = Object.entries(monthlyRevenueGrouped).map(([month, revenue]) => ({
      month,
      revenue
    })).sort((a, b) => new Date(b.month) - new Date(a.month));

    return NextResponse.json({
      totalRevenue: totalRevenue._sum.amount || 0,
      totalTransactions,
      paidTransactions,
      pendingTransactions,
      failedTransactions,
      refundedTransactions,
      revenueByProvider,
      monthlyRevenue: finalMonthlyRevenue,
    });
  } catch (error) {
    console.error('Reports Error:', error);
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 });
  }
}
