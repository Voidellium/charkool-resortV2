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

    // Set the selected model to inactive
    await prisma.threeDModel.update({
      where: { id: modelId },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting model inactive:", error);
    return NextResponse.json(
      { error: "Failed to set model inactive" },
      { status: 500 }
    );
  }
}
