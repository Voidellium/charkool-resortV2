import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';

// ✅ GET: All rooms or available rooms if checkIn/checkOut provided
export const GET = async (req) => {
  try {
    const url = new URL(req.url);
    const checkIn = url.searchParams.get('checkIn');
    const checkOut = url.searchParams.get('checkOut');

    // Fix: Prisma enum mismatch error - fetch rooms using raw query to avoid enum issues
    let rooms = await prisma.$queryRaw`SELECT * FROM "Room" ORDER BY "name" ASC`;

    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      const bookings = await prisma.booking.findMany({
        where: {
          OR: [
            { checkIn: { lte: checkOutDate }, checkOut: { gte: checkInDate } },
          ],
        },
        select: { roomId: true },
      });

      const bookingCounts = bookings.reduce((acc, b) => {
        acc[b.roomId] = (acc[b.roomId] || 0) + 1;
        return acc;
      }, {});

      rooms = rooms.map((room) => ({
        ...room,
        quantity: room.quantity - (bookingCounts[room.id] || 0),
      }));
    }

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('❌ GET rooms error:', error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
};

// ✅ POST: Create a new room
export const POST = async (req) => {
  try {
    const formData = await req.formData();
    const name = formData.get('name');
    const type = formData.get('type');
    const price = Number(formData.get('price')) || 0;
    const quantity = Number(formData.get('quantity')) || 1;
    const description = formData.get('description');

    let imageUrl = null;
    const image = formData.get('image');
    if (image && image.name) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const filePath = path.join(process.cwd(), 'public/uploads', image.name);
      await writeFile(filePath, buffer);
      imageUrl = `/uploads/${image.name}`;
    }

    const newRoom = await prisma.room.create({
      data: { name, type, price, quantity, description, image: imageUrl },
    });

    return NextResponse.json(newRoom, { status: 201 });
  } catch (error) {
    console.error('❌ POST room error:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
};

// ✅ OPTIONS: Preflight for CORS
export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
  });
};
