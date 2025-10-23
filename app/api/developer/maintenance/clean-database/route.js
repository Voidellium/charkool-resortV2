import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../src/lib/auth";
import prisma from "../../../../../lib/prisma";

/**
 * POST /api/developer/maintenance/clean-database
 * Clean expired and old database records
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cleanType, dryRun = false } = await request.json();
    
    const results = {
      otps: 0,
      sessions: 0,
      systemLogs: 0,
      auditTrails: 0
    };

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    if (dryRun) {
      // Just count what would be deleted
      const [otps, sessions, logs, audits] = await Promise.all([
        prisma.oTP.count({
          where: { createdAt: { lt: oneDayAgo } }
        }),
        prisma.session.count({
          where: { expires: { lt: now } }
        }),
        prisma.systemLog.count({
          where: { timestamp: { lt: fiveDaysAgo } }
        }),
        prisma.auditTrail.count({
          where: { timestamp: { lt: ninetyDaysAgo } }
        })
      ]);

      return NextResponse.json({
        dryRun: true,
        wouldDelete: {
          otps,
          sessions,
          systemLogs: logs,
          auditTrails: audits
        }
      });
    }

    // Actual deletion
    if (!cleanType || cleanType === 'otps') {
      const result = await prisma.oTP.deleteMany({
        where: { createdAt: { lt: oneDayAgo } }
      });
      results.otps = result.count;
    }

    if (!cleanType || cleanType === 'sessions') {
      const result = await prisma.session.deleteMany({
        where: { expires: { lt: now } }
      });
      results.sessions = result.count;
    }

    if (!cleanType || cleanType === 'logs') {
      const result = await prisma.systemLog.deleteMany({
        where: { timestamp: { lt: fiveDaysAgo } }
      });
      results.systemLogs = result.count;
    }

    if (!cleanType || cleanType === 'audits') {
      const result = await prisma.auditTrail.deleteMany({
        where: { timestamp: { lt: ninetyDaysAgo } }
      });
      results.auditTrails = result.count;
    }

    const totalDeleted = Object.values(results).reduce((sum, val) => sum + val, 0);

    return NextResponse.json({
      success: true,
      results,
      totalDeleted,
      message: `Cleaned ${totalDeleted} database records`
    });
  } catch (error) {
    console.error("Error cleaning database:", error);
    return NextResponse.json(
      { error: "Failed to clean database", details: error.message },
      { status: 500 }
    );
  }
}
