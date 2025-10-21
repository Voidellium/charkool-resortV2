import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../src/lib/auth";
import prisma from "../../../../lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('API Session:', session?.user); // Debug log
    
    if (!session || session.user?.role !== "DEVELOPER") {
      console.log('Unauthorized access attempt:', session?.user?.role);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const models = await prisma.threeDModel.findMany({
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        developer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return NextResponse.json(models);
  } catch (error) {
    console.error("Error fetching 3D models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}