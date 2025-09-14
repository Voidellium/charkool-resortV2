// app/api/reports/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ✅ GET: Reports
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userType = searchParams.get("userType");
    const status = searchParams.get("status");

    // ✅ Amenities usage report
    const amenitiesUsage = await prisma.bookingAmenity.groupBy({
      by: ["amenityInventoryId"],
      _count: { amenityInventoryId: true },
    });

    // Fetch from AmenityInventory
    const amenities = await prisma.amenityInventory.findMany();

    const amenityReport = amenitiesUsage.map((a) => ({
      amenity:
        amenities.find((am) => am.id === a.amenityInventoryId)?.name || "Unknown",
      count: a._count.amenityInventoryId,
    }));

    // ✅ Bookings (filtered by date, userType, status)
    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
        ...(status && status !== "All" ? { status } : {}),
        user: userType && userType !== "All" ? { role: userType } : {},
      },
      include: {
        room: true,
        user: true,
        amenities: {
          include: {
            amenity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // ✅ Aggregates
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce(
      (sum, b) => sum + Number(b.totalPrice || 0),
      0
    );
    const occupiedRooms = new Set(bookings.map((b) => b.roomId)).size;

    // ✅ Monthly breakdown (group by month)
    const monthly = bookings.reduce((acc, b) => {
      const month = b.createdAt.toISOString().slice(0, 7); // e.g. "2025-08"
      if (!acc[month]) {
        acc[month] = { month, bookings: 0, revenue: 0 };
      }
      acc[month].bookings++;
      acc[month].revenue += Number(b.totalPrice || 0);
      return acc;
    }, {});

    const monthlyReport = Object.values(monthly);

    return NextResponse.json({
      totalBookings,
      totalRevenue,
      occupancyRate:
        bookings.length > 0 ? (occupiedRooms / bookings.length) * 100 : 0,
      amenityReport,
      monthlyReport,
      bookings,
    });
  } catch (error) {
    console.error("❌ Error generating report:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch report" },
      { status: 500 }
    );
  }
}