import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../src/lib/auth";
import prisma from "../../../../../lib/prisma";

/**
 * POST /api/developer/logs/resolve
 * Mark a log as resolved
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { logId } = await request.json();

    if (!logId) {
      return NextResponse.json({ error: "Log ID required" }, { status: 400 });
    }

    // Update log to resolved
    const updatedLog = await prisma.systemLog.update({
      where: { id: logId },
      data: {
        resolved: true,
        resolvedBy: session.user.id,
        resolvedAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true,
      log: updatedLog
    });
  } catch (error) {
    console.error("Error resolving log:", error);
    return NextResponse.json(
      { error: "Failed to resolve log" },
      { status: 500 }
    );
  }
}
