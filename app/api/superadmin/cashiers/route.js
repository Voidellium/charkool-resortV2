import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../src/lib/auth";
import prisma from "../../../../lib/prisma";

// GET /api/superadmin/cashiers
// Returns: [{ id, name }]
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { role: "CASHIER" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("list cashiers error:", error);
    return NextResponse.json({ error: "Failed to list cashiers" }, { status: 500 });
  }
}
