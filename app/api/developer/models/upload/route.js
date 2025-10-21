import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../src/lib/auth";
import prisma from "../../../../../lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name;
    const fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    const validTypes = ['.gltf', '.glb', '.obj'];
    
    if (!validTypes.includes(fileExt)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload GLTF or OBJ files only." },
        { status: 400 }
      );
    }

    // Check if file already exists
    const existingModel = await prisma.threeDModel.findUnique({
      where: { fileName: fileName }
    });

    if (existingModel) {
      return NextResponse.json(
        { error: "A model with this filename already exists" },
        { status: 409 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "public", "models");
    await mkdir(uploadDir, { recursive: true });

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, fileName);
    
    await writeFile(filePath, buffer);

    // Determine file type for database
    const fileType = fileExt === '.obj' ? 'OBJ' : 'GLTF';

    // Save to database
    const newModel = await prisma.threeDModel.create({
      data: {
        name: fileName.replace(fileExt, '').replace(/[_-]/g, ' '),
        fileName: fileName,
        filePath: `/models/${fileName}`,
        fileType: fileType,
        fileSize: buffer.length,
        uploadedBy: parseInt(session.user.id),
        isActive: false,
        description: `Uploaded by ${session.user.firstName} ${session.user.lastName || ''}`
      }
    });

    return NextResponse.json({
      success: true,
      model: newModel
    });

  } catch (error) {
    console.error("Error uploading model:", error);
    return NextResponse.json(
      { error: "Failed to upload model" },
      { status: 500 }
    );
  }
}