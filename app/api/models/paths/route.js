import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Public API to get current 3D model paths
export async function GET() {
  try {
    // Get all active model configurations
    const configs = await prisma.threeDModelConfig.findMany();

    // Transform into a usable format
    const modelPaths = {
      resortMap: configs.find(c => c.modelType === 'RESORT_MAP')?.modelPath || '/models/WholeMap_12.glb',
      interiors: {
        Teepee: configs.find(c => c.modelType === 'INTERIOR_TEEPEE')?.modelPath || '/models/Interior_Teepee.glb',
        Villa: configs.find(c => c.modelType === 'INTERIOR_VILLA')?.modelPath || '/models/Interior_Villa.glb',
        Loft: configs.find(c => c.modelType === 'INTERIOR_LOFT')?.modelPath || '/models/Interior_Loft.glb'
      }
    };

    return NextResponse.json(modelPaths);
  } catch (error) {
    console.error("Error fetching model paths:", error);
    
    // Return default paths if database fails
    return NextResponse.json({
      resortMap: '/models/WholeMap_12.glb',
      interiors: {
        Teepee: '/models/Interior_Teepee.glb',
        Villa: '/models/Interior_Villa.glb',
        Loft: '/models/Interior_Loft.glb'
      }
    });
  }
}
