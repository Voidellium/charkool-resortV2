import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import { addMinutes } from 'date-fns';

export async function POST(req) {
  const { roomId } = await req.json();

  const now = new Date();
  const heldUntil = addMinutes(now, 180); // 3-hour hold

  const updatedRoom = await prisma.room.update({
    where: { id: roomId },
    data: {
      status: 'held',
      heldUntil,
    },
  });

  return Response.json({ success: true, room: updatedRoom });
}
