import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { recordAudit } from '@/src/lib/audit';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

// Helper function to serialize BigInt values
function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const promotion = await prisma.promotion.findUnique({
      where: { id: parseInt(id) },
    });
    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }
    return NextResponse.json(serializeBigInt(promotion));
  } catch (error) {
    console.error('Fetch Promotion Error:', error);
    return NextResponse.json({ error: 'Failed to fetch promotion' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const formData = await request.formData();
    const title = formData.get('title');
    const description = formData.get('description');
    const discountType = formData.get('discountType');
    const discountValue = parseInt(formData.get('discountValue'));
    const targetType = formData.get('targetType');
    const isActive = formData.get('isActive') === 'true';
    const startDate = new Date(formData.get('startDate'));
    const endDate = new Date(formData.get('endDate'));
    const imageFile = formData.get('image');

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (discountType) updateData.discountType = discountType;
    if (discountValue) updateData.discountValue = discountValue;
    if (targetType) updateData.targetType = targetType;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;

    if (imageFile && imageFile.size > 0) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(imageFile.type)) {
        return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, GIF allowed.' }, { status: 400 });
      }
      if (imageFile.size > 5 * 1024 * 1024) { // 5MB limit
        return NextResponse.json({ error: 'File size too large. Max 5MB.' }, { status: 400 });
      }

      // Save file to public/uploads
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadsDir, { recursive: true });
      const fileName = `${Date.now()}-${imageFile.name}`;
      const filePath = path.join(uploadsDir, fileName);
      const bytes = await imageFile.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));
      updateData.image = `/uploads/${fileName}`;

      // Delete old image if exists
      const existingPromotion = await prisma.promotion.findUnique({ where: { id: parseInt(id) } });
      if (existingPromotion?.image) {
        const oldPath = path.join(process.cwd(), 'public', existingPromotion.image);
        try {
          await unlink(oldPath);
        } catch (err) {
          console.error('Failed to delete old image:', err);
        }
      }

      // Note: On Vercel, uploaded files are ephemeral. For production, use a cloud storage service like Cloudinary or S3.
      // Set STORAGE_PROVIDER env var to switch to cloud storage.
    }

    const promotion = await prisma.promotion.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // Record audit for update and publish
    try {
      const token = await getToken({ req: request, secret: JWT_SECRET });
      await recordAudit({
        actorId: token?.sub ? parseInt(token.sub) : null,
        actorName: token?.name || token?.email || 'Unknown',
        actorRole: token?.role || 'ADMIN',
        action: 'UPDATE',
        entity: 'Promotion',
        entityId: String(promotion.id),
        details: `Updated promotion "${promotion.title}"`,
      });

      if (updateData.isActive === true) {
        await recordAudit({
          actorId: token?.sub ? parseInt(token.sub) : null,
          actorName: token?.name || token?.email || 'Unknown',
          actorRole: token?.role || 'ADMIN',
          action: 'PUBLISH',
          entity: 'Promotion',
          entityId: String(promotion.id),
          details: `Published promotion "${promotion.title}"`,
        });
      }
    } catch (auditErr) {
      console.error('Failed to record audit for promotion update/publish', auditErr);
    }

    return NextResponse.json(serializeBigInt(promotion));
  } catch (error) {
    console.error('Update Promotion Error:', error);
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const promotion = await prisma.promotion.findUnique({ where: { id: parseInt(id) } });
    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    // Delete image file if exists
    if (promotion.image) {
      const filePath = path.join(process.cwd(), 'public', promotion.image);
      try {
        await unlink(filePath);
      } catch (err) {
        console.error('Failed to delete image:', err);
      }
    }

    await prisma.promotion.delete({
      where: { id: parseInt(id) },
    });

    try {
      const token = await getToken({ req: request, secret: JWT_SECRET });
      await recordAudit({
        actorId: token?.sub ? parseInt(token.sub) : null,
        actorName: token?.name || token?.email || 'Unknown',
        actorRole: token?.role || 'ADMIN',
        action: 'DELETE',
        entity: 'Promotion',
        entityId: String(id),
        details: `Deleted promotion id ${id}`,
      });
    } catch (auditErr) {
      console.error('Failed to record audit for promotion delete', auditErr);
    }

    return NextResponse.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    console.error('Delete Promotion Error:', error);
    return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 });
  }
}
