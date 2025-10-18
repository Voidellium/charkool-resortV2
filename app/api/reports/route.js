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
        rooms: { include: { room: true } },
        user: true,
        // legacy amenities still loaded if ever needed
        amenities: { include: { amenity: true } },
        // new amenity systems
        optionalAmenities: { include: { optionalAmenity: true } },
        rentalAmenities: { include: { rentalAmenity: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // ✅ Aggregates
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce(
      (sum, b) => sum + Number(b.totalPrice || 0),
      0
    );
    // Approximate occupied room units based on BookingRoom quantities
    const occupiedRooms = bookings.reduce((sum, b) => {
      const qty = (b.rooms || []).reduce((s, r) => s + (r.quantity || 0), 0);
      return sum + qty;
    }, 0);

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

    // ✅ Monthly room type distribution (Rooms availed per month by Room.type)
    const roomTypeMonthlyMap = {};
    const roomTypesSet = new Set();
    for (const b of bookings) {
      const month = b.createdAt.toISOString().slice(0, 7);
      if (!roomTypeMonthlyMap[month]) roomTypeMonthlyMap[month] = { month, totalRoomAvailed: 0 };
      for (const br of b.rooms || []) {
        const type = br.room?.type || "UNKNOWN";
        roomTypesSet.add(type);
        roomTypeMonthlyMap[month][type] = (roomTypeMonthlyMap[month][type] || 0) + (br.quantity || 0);
        roomTypeMonthlyMap[month].totalRoomAvailed += (br.quantity || 0);
      }
    }
    const monthlyRoomTypeReport = Object.values(roomTypeMonthlyMap)
      // keep months in chronological order like monthlyReport
      .sort((a, b) => a.month.localeCompare(b.month));
    const roomTypes = Array.from(roomTypesSet);

    // ✅ Amenity usage (new system): Optional & Rental
    const optionalCounts = new Map();
    const rentalCounts = new Map();
    for (const b of bookings) {
      for (const oa of b.optionalAmenities || []) {
        const name = oa.optionalAmenity?.name || "Unknown";
        const qty = oa.quantity || 1;
        optionalCounts.set(name, (optionalCounts.get(name) || 0) + qty);
      }
      for (const ra of b.rentalAmenities || []) {
        const name = ra.rentalAmenity?.name || "Unknown";
        const qty = ra.quantity || 1; // count by quantity; could incorporate hoursUsed if needed
        rentalCounts.set(name, (rentalCounts.get(name) || 0) + qty);
      }
    }

    const optionalAmenityReport = Array.from(optionalCounts.entries()).map(([amenity, count]) => ({ amenity, count }));
    const rentalAmenityReport = Array.from(rentalCounts.entries()).map(([amenity, count]) => ({ amenity, count }));

    return NextResponse.json({
      totalBookings,
      totalRevenue,
      occupancyRate:
        bookings.length > 0 ? (occupiedRooms / bookings.length) * 100 : 0,
      monthlyReport,
      // new datasets
      monthlyRoomTypeReport,
      roomTypes,
      optionalAmenityReport,
      rentalAmenityReport,
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