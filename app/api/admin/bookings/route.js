import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const bookings = await prisma.booking.findMany({
      include: { room: true },
    });

    return new NextResponse(JSON.stringify({ bookings }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // ✅ allow all for testing
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error(err);
    return new NextResponse(JSON.stringify({ error: "Failed to fetch bookings" }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  }
}
