import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../src/lib/auth";
import prisma from "../../../../../lib/prisma";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { modelId } = await request.json();

    if (!modelId) {
      return NextResponse.json({ error: "Model ID required" }, { status: 400 });
    }

    // Start transaction to ensure only one model is active
    await prisma.$transaction([
      // Set all models to inactive
      prisma.threeDModel.updateMany({
        data: { isActive: false }
      }),
      // Set the selected model to active
      prisma.threeDModel.update({
        where: { id: modelId },
        data: { isActive: true }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting active model:", error);
    return NextResponse.json(
      { error: "Failed to set active model" },
      { status: 500 }
    );
  }
}