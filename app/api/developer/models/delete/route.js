import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../src/lib/auth";
import prisma from "../../../../../lib/prisma";
import fs from 'fs';
import path from 'path';

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { modelId } = await request.json();

    if (!modelId) {
      return NextResponse.json({ error: "Model ID required" }, { status: 400 });
    }

    // Get the model to find the file path
    const model = await prisma.threeDModel.findUnique({
      where: { id: modelId }
    });

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Delete the file from the filesystem
    try {
      const publicPath = path.join(process.cwd(), 'public');
      const fullPath = path.join(publicPath, model.filePath.replace('/public/', ''));
      
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (fileError) {
      console.error("Error deleting file:", fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await prisma.threeDModel.delete({
      where: { id: modelId }
    });

    return NextResponse.json({ success: true, message: "Model deleted successfully" });
  } catch (error) {
    console.error("Error deleting model:", error);
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 }
    );
  }
}
