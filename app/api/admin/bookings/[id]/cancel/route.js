import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(_, { params }) {
  const bookingId = parseInt(params.id);

  try {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "cancelled" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
