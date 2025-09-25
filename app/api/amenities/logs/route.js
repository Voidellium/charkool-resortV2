import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ✅ GET all logs
export async function GET() {
  try {
    const logs = await prisma.amenityLog.findMany({
      orderBy: { timestamp: "desc" }
    });

    return NextResponse.json(
      logs.map((log) => ({
        id: log.id,
        action: log.action,
        amenityName: log.amenityName || "Unknown",
        user: log.user || "System",
        timestamp: log.timestamp,
      }))
    );
  } catch (error) {
    console.error("GET logs error:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
