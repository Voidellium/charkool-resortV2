import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Helper function to serialize BigInt values
function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

export const GET = async () => {
  try {
    console.log("Payments today API: Starting request");
    
    // Test Prisma connection with a safe query
    const connectionTest = await prisma.payment.findFirst({
      select: { id: true },
      take: 1
    });
    console.log("Payments today API: Database connection test passed");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    console.log("Payments today API: Querying payments from", startOfDay, "to", endOfDay);

    const payments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        booking: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                contactNumber: true,
              }
            },
            rooms: {
              include: {
                room: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    price: true,
                  }
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("Payments today API: Query successful, found", payments.length, "payments");
    
    // Serialize BigInt values before returning
    const serializedPayments = serializeBigInt(payments);
    return NextResponse.json(serializedPayments);
  } catch (error) {
    console.error("Error fetching today's payments:", error);
    console.error("Error details:", error.message, error.stack);
    return NextResponse.json(
      { error: "Failed to fetch payments", details: error.message },
      { status: 500 }
    );
  }
};
