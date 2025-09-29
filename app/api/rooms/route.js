import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BookingStatus } from '@prisma/client';

// ✅ GET: All rooms or available rooms if checkIn/checkOut provided
export const GET = async (req) => {
  try {
    const url = new URL(req.url);
    const checkIn = url.searchParams.get('checkIn');
    const checkOut = url.searchParams.get('checkOut');

    let rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });

    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const now = new Date();

      // Query BookingRoom with booking filters to get booked quantities per room
      const bookedRooms = await prisma.bookingRoom.findMany({
        where: {
          booking: {
            checkIn: { lte: checkOutDate },
            checkOut: { gte: checkInDate },
            status: {
              in: [BookingStatus.Pending, BookingStatus.Confirmed],
            },
            OR: [
              { heldUntil: null },
              { heldUntil: { gt: now } },
            ],
          },
        },
        select: {
          roomId: true,
          quantity: true,
        },
      });

      // Aggregate booked quantities per roomId
      const bookedCounts = {};
      bookedRooms.forEach(br => {
        bookedCounts[br.roomId] = (bookedCounts[br.roomId] || 0) + br.quantity;
      });

      rooms = rooms.map(r => {
        const booked = bookedCounts[r.id] || 0;
        const remaining = r.quantity - booked;
        return { ...r, available: remaining > 0, remaining };
      });
    }

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('❌ GET rooms error:', error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
};

// ✅ POST: Create a new room
import { writeFile } from 'fs/promises';
import path from 'path';

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