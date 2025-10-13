import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { recordAudit } from '@/src/lib/audit';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

export const config = { api: { bodyParser: false } };

// ✅ PUT: Update room
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const formData = await req.formData();
    const name = formData.get('name')?.toString() || '';
    const type = formData.get('type')?.toString() || '';
    const price = Number(formData.get('price')) || 0;
    const quantity = Number(formData.get('quantity')) || 0;
    const description = formData.get('description')?.toString() || '';
    const imageFile = formData.get('image');

    const data = { name, type, price, quantity };

    if (imageFile && imageFile instanceof File) {
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const fileName = `${Date.now()}-${imageFile.name}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);

      data.image = `/uploads/${fileName}`;
    }

    const updatedRoom = await prisma.room.update({
      where: { id: Number(id) },
      data,
    });

    try {
      const token = await getToken({ req, secret: JWT_SECRET });
      await recordAudit({
        actorId: token?.sub ? parseInt(token.sub) : null,
        actorName: token?.name || token?.email || 'Unknown',
        actorRole: token?.role || 'ADMIN',
        action: 'UPDATE',
        entity: 'Room',
        entityId: String(updatedRoom.id),
        details: `Updated room "${updatedRoom.name}"`,
      });
    } catch (auditErr) {
      console.error('Failed to record audit for room update', auditErr);
    }

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error('❌ PUT room error:', error);
    return NextResponse.json(
      { error: 'Failed to update room', details: error.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE: Delete room
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    // Check if there are any bookings for this room
    const bookingCount = await prisma.booking.count({ where: { roomId: Number(id) } });
    if (bookingCount > 0) {
      return NextResponse.json({ error: 'Cannot delete room with existing bookings' }, { status: 400 });
    }
    // Now delete the room
    await prisma.room.delete({ where: { id: Number(id) } });

    try {
      const token = await getToken({ req, secret: JWT_SECRET });
      await recordAudit({
        actorId: token?.sub ? parseInt(token.sub) : null,
        actorName: token?.name || token?.email || 'Unknown',
        actorRole: token?.role || 'ADMIN',
        action: 'DELETE',
        entity: 'Room',
        entityId: String(id),
        details: `Deleted room id ${id}`,
      });
    } catch (auditErr) {
      console.error('Failed to record audit for room delete', auditErr);
    }
    return NextResponse.json({ message: 'Room deleted' });
  } catch (error) {
    console.error('❌ DELETE room error:', error);
    return NextResponse.json(
      { error: 'Failed to delete room', details: error.message },
      { status: 500 }
    );
  }
}