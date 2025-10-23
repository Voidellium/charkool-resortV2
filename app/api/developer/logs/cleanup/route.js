import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../src/lib/auth";
import prisma from "../../../../../lib/prisma";

/**
 * DELETE /api/developer/logs/cleanup
 * Clean up old logs based on retention policy (5 days)
 */
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate cutoff date (5 days ago)
    const retentionDays = 5;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Delete old logs
    const result = await prisma.systemLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    });

    return NextResponse.json({ 
      success: true,
      deletedCount: result.count,
      message: `Deleted ${result.count} logs older than ${retentionDays} days`
    });
  } catch (error) {
    console.error("Error cleaning up logs:", error);
    return NextResponse.json(
      { error: "Failed to cleanup logs" },
      { status: 500 }
    );
  }
}
