import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../src/lib/auth";
import fs from 'fs';
import path from 'path';

/**
 * POST /api/developer/maintenance/clear-cache
 * Clear Next.js cache
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cacheType } = await request.json();
    
    let clearedSize = 0;
    const results = [];

    // Helper function to delete directory contents
    const deleteFolderContents = (folderPath) => {
      if (!fs.existsSync(folderPath)) {
        return 0;
      }
      
      let deletedSize = 0;
      const files = fs.readdirSync(folderPath);
      
      for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          deletedSize += deleteFolderContents(filePath);
          fs.rmdirSync(filePath);
        } else {
          deletedSize += stats.size;
          fs.unlinkSync(filePath);
        }
      }
      return deletedSize;
    };

    // Clear Next.js cache
    if (!cacheType || cacheType === 'nextjs') {
      const nextCachePath = path.join(process.cwd(), '.next', 'cache');
      
      if (fs.existsSync(nextCachePath)) {
        const size = deleteFolderContents(nextCachePath);
        clearedSize += size;
        results.push({
          type: 'Next.js Cache',
          size,
          status: 'cleared'
        });
      } else {
        results.push({
          type: 'Next.js Cache',
          size: 0,
          status: 'not_found'
        });
      }
    }

    // Note: In production (Vercel), cache clearing might be limited
    // This works best in development or self-hosted environments

    return NextResponse.json({
      success: true,
      clearedSize,
      results,
      message: `Cache cleared successfully. Total: ${(clearedSize / 1024 / 1024).toFixed(2)} MB`
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    return NextResponse.json(
      { error: "Failed to clear cache", details: error.message },
      { status: 500 }
    );
  }
}
