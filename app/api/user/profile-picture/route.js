import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create filename with user ID and timestamp
    const fileExtension = path.extname(file.name) || '.jpg';
    const filename = `profile_${session.user.id}_${Date.now()}${fileExtension}`;
    
    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);
    
    const fileUrl = `/uploads/profiles/${filename}`;
    
    // Update user profile picture in database
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(session.user.id) },
      data: { image: fileUrl },
      select: { id: true, name: true, email: true, image: true }
    });

    return NextResponse.json({ 
      success: true, 
      profilePicture: fileUrl,
      user: updatedUser
    });

  } catch (error) {
    console.error('Profile picture upload error:', error);
    return NextResponse.json({ error: 'Failed to upload profile picture' }, { status: 500 });
  }
}

// GET current user's profile picture
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { id: true, name: true, email: true, image: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      profilePicture: user.image,
      user: user
    });

  } catch (error) {
    console.error('Get profile picture error:', error);
    return NextResponse.json({ error: 'Failed to get profile picture' }, { status: 500 });
  }
}

// DELETE user's profile picture
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current image path for deletion
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { image: true }
    });

    // Update user to remove profile picture
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(session.user.id) },
      data: { image: null },
      select: { id: true, name: true, email: true, image: true }
    });

    // Try to delete the old file if it exists and is a local file
    if (user?.image && user.image.startsWith('/uploads/')) {
      try {
        const filePath = path.join(process.cwd(), 'public', user.image);
        await fs.unlink(filePath);
      } catch (deleteError) {
        // File deletion error is not critical, just log it
        console.warn('Could not delete old profile picture file:', deleteError);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Profile picture removed successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Delete profile picture error:', error);
    return NextResponse.json({ error: 'Failed to delete profile picture' }, { status: 500 });
  }
}