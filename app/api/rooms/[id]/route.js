import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAudit } from '@/src/lib/audit';
import { getToken } from 'next-auth/jwt';
import { del, put } from '@vercel/blob';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

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
    const existingRoom = await prisma.room.findUnique({
      where: { id: Number(id) },
      select: { image: true },
    });

    // Only update image if a new file was uploaded
    if (imageFile && imageFile instanceof File && imageFile.size > 0) {
      const MAX_SIZE = 25 * 1024 * 1024;
      const ALLOWED_TYPES = ['image/jpeg', 'image/pjpeg', 'image/png'];

      if (imageFile.size > MAX_SIZE) {
        return NextResponse.json(
          { error: 'File size exceeds 25MB limit' },
          { status: 400 }
        );
      }

      if (!ALLOWED_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          { error: 'Only JPG, JPEG, JFIF, and PNG image files are allowed' },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      try {
        const key = `rooms/${Date.now()}-${safeName}`;
        const options = { access: 'private', contentType: imageFile.type };
        console.debug('Uploading room image (update) to blob store', { key, options });
        const blob = await put(key, buffer, options);
        data.image = blob.url;
      } catch (putErr) {
        console.error('Blob put() failed in PUT /api/rooms/[id]:', putErr && putErr.stack ? putErr.stack : putErr);
        throw putErr;
      }

      if (existingRoom?.image && existingRoom.image.startsWith('https://')) {
        try {
          await del(existingRoom.image);
        } catch (deleteErr) {
          console.warn('Failed to delete previous room image blob:', deleteErr);
        }
      }
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
        actorRole: token?.role || 'SUPERADMIN',
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
        actorRole: token?.role || 'SUPERADMIN',
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