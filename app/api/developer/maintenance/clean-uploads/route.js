import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../src/lib/auth";
import prisma from "../../../../../lib/prisma";
import fs from 'fs';
import path from 'path';

/**
 * POST /api/developer/maintenance/clean-uploads
 * Find and optionally remove orphaned upload files
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dryRun = true } = await request.json();
    
    const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
    
    if (!fs.existsSync(uploadsPath)) {
      return NextResponse.json({
        success: true,
        orphanedFiles: [],
        message: 'Uploads directory does not exist'
      });
    }

    // Get all uploaded file references from database
    const [payments, threeDModels] = await Promise.all([
      prisma.payment.findMany({
        select: { receiptUrl: true }
      }),
      prisma.threeDModel.findMany({
        select: { filePath: true }
      })
    ]);

    // Extract filenames from database
    const referencedFiles = new Set();
    
    payments.forEach(payment => {
      if (payment.receiptUrl) {
        const filename = path.basename(payment.receiptUrl);
        referencedFiles.add(filename);
      }
    });

    threeDModels.forEach(model => {
      if (model.filePath) {
        const filename = path.basename(model.filePath);
        referencedFiles.add(filename);
      }
    });

    // Scan uploads directory for orphaned files
    const scanDirectory = (dirPath) => {
      const orphanedFiles = [];
      
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          orphanedFiles.push(...scanDirectory(filePath));
        } else {
          // Check if file is referenced in database
          if (!referencedFiles.has(file)) {
            orphanedFiles.push({
              name: file,
              path: filePath,
              size: stats.size,
              lastModified: stats.mtime
            });
          }
        }
      }
      
      return orphanedFiles;
    };

    const orphanedFiles = scanDirectory(uploadsPath);
    
    let deletedSize = 0;
    let deletedCount = 0;

    if (!dryRun && orphanedFiles.length > 0) {
      // Actually delete the orphaned files
      for (const file of orphanedFiles) {
        try {
          fs.unlinkSync(file.path);
          deletedSize += file.size;
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete ${file.path}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      orphanedFiles: orphanedFiles.map(f => ({
        name: f.name,
        size: f.size,
        lastModified: f.lastModified
      })),
      totalFiles: orphanedFiles.length,
      totalSize: orphanedFiles.reduce((sum, f) => sum + f.size, 0),
      deletedCount: dryRun ? 0 : deletedCount,
      deletedSize: dryRun ? 0 : deletedSize,
      message: dryRun 
        ? `Found ${orphanedFiles.length} orphaned files (${(orphanedFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB)`
        : `Deleted ${deletedCount} orphaned files (${(deletedSize / 1024 / 1024).toFixed(2)} MB)`
    });
  } catch (error) {
    console.error("Error scanning uploads:", error);
    return NextResponse.json(
      { error: "Failed to scan uploads", details: error.message },
      { status: 500 }
    );
  }
}
