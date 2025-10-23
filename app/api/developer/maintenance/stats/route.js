import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../src/lib/auth";
import prisma from "../../../../../lib/prisma";
import fs from 'fs';
import path from 'path';

/**
 * GET /api/developer/maintenance/stats
 * Get storage and maintenance statistics
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Database statistics
    const [
      totalOTPs,
      expiredOTPs,
      expiredSessions,
      oldSystemLogs,
      oldAuditTrails,
      totalSystemLogs,
      totalAuditTrails,
      totalBookings,
      totalPayments
    ] = await Promise.all([
      // Total OTPs
      prisma.oTP.count(),
      
      // Expired OTPs (older than 24 hours)
      prisma.oTP.count({
        where: { createdAt: { lt: oneDayAgo } }
      }),
      
      // Expired sessions
      prisma.session.count({
        where: { expires: { lt: now } }
      }),
      
      // Old system logs (older than 5 days)
      prisma.systemLog.count({
        where: { timestamp: { lt: fiveDaysAgo } }
      }),
      
      // Old audit trails (older than 30 days)
      prisma.auditTrail.count({
        where: { timestamp: { lt: thirtyDaysAgo } }
      }),
      
      // Total system logs
      prisma.systemLog.count(),
      
      // Total audit trails
      prisma.auditTrail.count(),
      
      // Total bookings
      prisma.booking.count(),
      
      // Total payments
      prisma.payment.count()
    ]);

    // File system statistics
    const publicPath = path.join(process.cwd(), 'public');
    const uploadsPath = path.join(publicPath, 'uploads');
    const modelsPath = path.join(publicPath, 'models');
    const imagesPath = path.join(publicPath, 'images');

    // Helper function to get directory size
    const getDirectorySize = (dirPath) => {
      try {
        if (!fs.existsSync(dirPath)) {
          return 0;
        }
        let totalSize = 0;
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            totalSize += getDirectorySize(filePath);
          } else {
            totalSize += stats.size;
          }
        }
        return totalSize;
      } catch (error) {
        console.error(`Error calculating size for ${dirPath}:`, error);
        return 0;
      }
    };

    // Calculate sizes
    const uploadsSize = getDirectorySize(uploadsPath);
    const modelsSize = getDirectorySize(modelsPath);
    const imagesSize = getDirectorySize(imagesPath);
    const totalFileSize = uploadsSize + modelsSize + imagesSize;

    // Next.js cache size (if accessible)
    const nextCachePath = path.join(process.cwd(), '.next', 'cache');
    const nextCacheSize = getDirectorySize(nextCachePath);

    // Estimate database size (rough calculation based on record counts)
    const estimatedDbSize = (
      (totalSystemLogs * 2048) + // ~2KB per log
      (totalAuditTrails * 1024) + // ~1KB per audit
      (totalBookings * 4096) +    // ~4KB per booking
      (totalPayments * 2048)      // ~2KB per payment
    );

    return NextResponse.json({
      database: {
        totalSize: estimatedDbSize,
        records: {
          systemLogs: totalSystemLogs,
          auditTrails: totalAuditTrails,
          bookings: totalBookings,
          payments: totalPayments,
          otps: totalOTPs,
          sessions: await prisma.session.count()
        },
        cleanable: {
          expiredOTPs,
          expiredSessions,
          oldSystemLogs,
          oldAuditTrails
        }
      },
      files: {
        totalSize: totalFileSize,
        breakdown: {
          uploads: uploadsSize,
          models: modelsSize,
          images: imagesSize
        }
      },
      cache: {
        nextCache: nextCacheSize
      },
      lastUpdated: now.toISOString()
    });
  } catch (error) {
    console.error("Error fetching maintenance stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
