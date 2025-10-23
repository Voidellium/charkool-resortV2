import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../src/lib/auth";
import prisma from "../../../../../lib/prisma";

/**
 * GET /api/developer/logs/stats
 * Get statistics about system logs
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Fetch various statistics
    const [
      totalLogs,
      todayLogs,
      yesterdayLogs,
      unresolvedErrors,
      unresolvedWarnings,
      errorsByCategory,
      recentTrends
    ] = await Promise.all([
      // Total logs
      prisma.systemLog.count(),
      
      // Today's logs
      prisma.systemLog.count({
        where: {
          timestamp: { gte: today }
        }
      }),
      
      // Yesterday's logs
      prisma.systemLog.count({
        where: {
          timestamp: { gte: yesterday, lt: today }
        }
      }),
      
      // Unresolved errors
      prisma.systemLog.count({
        where: {
          level: 'ERROR',
          resolved: false
        }
      }),
      
      // Unresolved warnings
      prisma.systemLog.count({
        where: {
          level: 'WARNING',
          resolved: false
        }
      }),
      
      // Errors by category (top 5)
      prisma.systemLog.groupBy({
        by: ['category'],
        where: {
          level: 'ERROR',
          timestamp: { gte: lastWeek }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 5
      }),
      
      // Recent trends (last 7 days)
      prisma.$queryRaw`
        SELECT 
          DATE(timestamp) as date,
          level,
          COUNT(*) as count
        FROM "SystemLog"
        WHERE timestamp >= ${lastWeek}
        GROUP BY DATE(timestamp), level
        ORDER BY date DESC
      `
    ]);

    // Calculate trend percentage
    const trendPercentage = yesterdayLogs > 0 
      ? ((todayLogs - yesterdayLogs) / yesterdayLogs * 100).toFixed(1)
      : todayLogs > 0 ? 100 : 0;

    return NextResponse.json({
      totalLogs,
      todayLogs,
      trendPercentage: parseFloat(trendPercentage),
      unresolvedErrors,
      unresolvedWarnings,
      errorsByCategory: errorsByCategory.map(item => ({
        category: item.category,
        count: item._count.id
      })),
      recentTrends
    });
  } catch (error) {
    console.error("Error fetching log statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
