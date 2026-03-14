import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all 3D model configurations
    const config = await prisma.threeDModelConfig.findMany({
      orderBy: { modelType: 'asc' }
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error fetching 3D model config:", error);
    return NextResponse.json(
      { error: "Failed to fetch model configuration" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { modelType, modelPath } = await request.json();

    if (!modelType || !modelPath) {
      return NextResponse.json(
        { error: "Model type and path are required" },
        { status: 400 }
      );
    }

    // Validate model type
    const validTypes = ['RESORT_MAP', 'INTERIOR_TEEPEE', 'INTERIOR_VILLA', 'INTERIOR_LOFT'];
    if (!validTypes.includes(modelType)) {
      return NextResponse.json(
        { error: "Invalid model type" },
        { status: 400 }
      );
    }

    // Update or create configuration
    const config = await prisma.threeDModelConfig.upsert({
      where: { modelType },
      update: { 
        modelPath,
        updatedBy: session.user.id,
        updatedAt: new Date()
      },
      create: {
        modelType,
        modelPath,
        updatedBy: session.user.id
      }
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error updating 3D model config:", error);
    return NextResponse.json(
      { error: "Failed to update model configuration" },
      { status: 500 }
    );
  }
}
