// src/app/api/amenities/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ✅ GET: only return { id, name } for booking use
export async function GET() {
  try {
    const amenities = await prisma.amenityInventory.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(amenities);
  } catch (error) {
    console.error("❌ Failed to fetch amenities:", error);
    return NextResponse.json(
      { error: "Failed to fetch amenities" },
      { status: 500 }
    );
  }
}