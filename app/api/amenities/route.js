// src/app/api/amenities/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ✅ GET: Return all amenity types for booking use
export async function GET() {
  try {
    // Fetch all amenity types
    const [inventoryAmenities, optionalAmenities, rentalAmenities] = await Promise.all([
      prisma.amenityInventory.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.optionalAmenity.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          maxQuantity: true
        },
        orderBy: { name: "asc" },
      }),
      prisma.rentalAmenity.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          pricePerUnit: true,
          pricePerHour: true,
          unitType: true
        },
        orderBy: { name: "asc" },
      })
    ]);

    // Structure the response with different amenity types
    const amenities = {
      inventory: inventoryAmenities,
      optional: optionalAmenities,
      rental: rentalAmenities
    };

    return NextResponse.json(amenities);
  } catch (error) {
    console.error("❌ Failed to fetch amenities:", error);
    return NextResponse.json(
      { error: "Failed to fetch amenities" },
      { status: 500 }
    );
  }
}
