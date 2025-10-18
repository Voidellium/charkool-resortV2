import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAudit } from '@/src/lib/audit';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

// ✅ GET: All rooms or available rooms if checkIn/checkOut provided
export const GET = async (req) => {
  try {
    const url = new URL(req.url);
    const checkIn = url.searchParams.get('checkIn');
    const checkOut = url.searchParams.get('checkOut');

    // Opportunistic cleanup: auto-cancel expired Pending bookings (heldUntil < now)
    // This avoids relying on an external scheduler by performing small, safe maintenance
    // during natural traffic to this endpoint. It only updates status and clears heldUntil;
    // restoration of amenity stocks is handled in the dedicated cancellation update path.
    try {
      const now = new Date();
      const expired = await prisma.booking.findMany({
        where: {
          status: 'Pending',
          heldUntil: { lt: now },
          // Do NOT auto-cancel if a reservation has already been paid or fully paid
          paymentStatus: { notIn: ['Reservation', 'Paid'] },
        },
        select: { id: true },
        take: 20, // cap per request to limit load
      });
      for (const item of expired) {
        try {
          await prisma.$transaction(async (tx) => {
            const b = await tx.booking.findUnique({
              where: { id: item.id },
              include: { optionalAmenities: true, rentalAmenities: true, user: true },
            });
            if (!b || b.status === 'Cancelled') return;
            if (b.paymentStatus === 'Reservation' || b.paymentStatus === 'Paid') return;
            // Safety check: skip if reservation or paid
            if (b.paymentStatus === 'Reservation' || b.paymentStatus === 'Paid') return;

            // Restore amenity stocks
            for (const oa of (b.optionalAmenities || [])) {
              await tx.optionalAmenity.update({ where: { id: oa.optionalAmenityId }, data: { quantity: { increment: oa.quantity } } });
            }
            for (const ra of (b.rentalAmenities || [])) {
              await tx.rentalAmenity.update({ where: { id: ra.rentalAmenityId }, data: { quantity: { increment: ra.quantity } } });
            }

            // Cancel the booking
            await tx.booking.update({
              where: { id: b.id },
              data: { status: 'Cancelled', paymentStatus: 'Pending', heldUntil: null, cancellationRemarks: 'Auto-cancelled due to payment timeout' },
            });

            // Update user cooldown only for CUSTOMER-originated online bookings
            if (b.userId && b.user && b.user.role === 'CUSTOMER') {
              const user = await tx.user.findUnique({ where: { id: b.userId } });
              const attempts = (user?.failedPaymentAttempts || 0) + 1;
              let cooldownUntil = null;
              if (attempts > 2) {
                const minutes = (attempts - 2) * 15; // 3rd->15, 4th->30, etc.
                cooldownUntil = new Date(Date.now() + minutes * 60 * 1000);
              }
              await tx.user.update({
                where: { id: b.userId },
                data: {
                  failedPaymentAttempts: attempts,
                  paymentCooldownUntil: cooldownUntil,
                },
              });
            }
          });
        } catch (perErr) {
          console.error('Auto-cancel transaction failed for booking', item.id, perErr);
        }
      }
    } catch (cleanupErr) {
      console.error('Opportunistic auto-cancel scan failed:', cleanupErr);
    }

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
              in: ['Pending', 'Confirmed'],
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

    // Record audit for room creation
    try {
      const token = await getToken({ req, secret: JWT_SECRET });
      await recordAudit({
        actorId: token?.sub ? parseInt(token.sub) : null,
        actorName: token?.name || token?.email || 'Unknown',
        actorRole: token?.role || 'ADMIN',
        action: 'CREATE',
        entity: 'Room',
        entityId: String(newRoom.id),
        details: `Created room "${newRoom.name}"`,
      });
    } catch (auditErr) {
      console.error('Failed to record audit for room creation', auditErr);
    }

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