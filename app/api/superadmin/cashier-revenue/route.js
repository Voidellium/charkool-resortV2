import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../src/lib/auth";
import prisma from "../../../../lib/prisma";

// GET /api/superadmin/cashier-revenue?date=YYYY-MM-DD
// Returns: [{ cashier: string, total: numberInCents }, ...]
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    if (!dateStr) {
      return NextResponse.json({ error: "Missing 'date' (YYYY-MM-DD)" }, { status: 400 });
    }

    // Create date range [start, end)
    const start = new Date(dateStr);
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
    }
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    // Fetch paid payments created on this date; attribute to cashier who verified (if role is CASHIER)
    const payments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        status: "Paid",
      },
      include: {
        verifiedBy: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    const totals = new Map();
    for (const p of payments) {
      if (p.verifiedBy && p.verifiedBy.role === "CASHIER") {
        const key = p.verifiedBy.name || `Cashier #${p.verifiedBy.id}`;
        const prev = totals.get(key) || 0;
        const amt = Number(p.amount || 0);
        totals.set(key, prev + (isNaN(amt) ? 0 : amt));
      }
    }

    const result = Array.from(totals.entries())
      .map(([cashier, total]) => ({ cashier, total }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json(result);
  } catch (error) {
    console.error("cashier-revenue error:", error);
    return NextResponse.json({ error: "Failed to compute revenue" }, { status: 500 });
  }
}
