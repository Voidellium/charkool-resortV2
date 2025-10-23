import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

/**
 * GET /api/cron/cleanup
 * Auto-cleanup cron job - runs every 2 days
 * This endpoint should be called by a cron service (Vercel Cron, external cron, etc.)
 */
export async function GET(request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-here';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = {
      logsDeleted: 0,
      otpsDeleted: 0,
      sessionsDeleted: 0,
      auditTrailsDeleted: 0
    };

    // 1. Delete old system logs (older than 5 days)
    const logCutoffDate = new Date();
    logCutoffDate.setDate(logCutoffDate.getDate() - 5);
    
    const logsResult = await prisma.systemLog.deleteMany({
      where: {
        timestamp: { lt: logCutoffDate }
      }
    });
    results.logsDeleted = logsResult.count;

    // 2. Delete expired OTPs (older than 24 hours)
    const otpCutoffDate = new Date();
    otpCutoffDate.setHours(otpCutoffDate.getHours() - 24);
    
    const otpsResult = await prisma.oTP.deleteMany({
      where: {
        createdAt: { lt: otpCutoffDate }
      }
    });
    results.otpsDeleted = otpsResult.count;

    // 3. Delete expired sessions
    const now = new Date();
    const sessionsResult = await prisma.session.deleteMany({
      where: {
        expires: { lt: now }
      }
    });
    results.sessionsDeleted = sessionsResult.count;

    // 4. Delete old audit trails (older than 90 days)
    const auditCutoffDate = new Date();
    auditCutoffDate.setDate(auditCutoffDate.getDate() - 90);
    
    const auditResult = await prisma.auditTrail.deleteMany({
      where: {
        timestamp: { lt: auditCutoffDate }
      }
    });
    results.auditTrailsDeleted = auditResult.count;

    console.log('Auto-cleanup completed:', results);

    return NextResponse.json({ 
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Auto-cleanup error:", error);
    return NextResponse.json(
      { error: "Cleanup failed", details: error.message },
      { status: 500 }
    );
  }
}
