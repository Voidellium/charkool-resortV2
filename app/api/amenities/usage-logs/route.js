import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
const isAuthorized = (role) => role === 'SUPERADMIN' || role === 'AMENITYINVENTORYMANAGER';

export async function GET(request) {
  const token = await getToken({ req: request, secret: JWT_SECRET });
  if (!token || !isAuthorized(token.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'Confirmed',
        OR: [
          { optionalAmenities: { some: {} } },
          { rentalAmenities: { some: {} } },
        ],
      },
      orderBy: { checkIn: 'desc' },
      include: {
        optionalAmenities: { include: { optionalAmenity: true } },
        rentalAmenities: { include: { rentalAmenity: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    });

    const results = bookings.map((b) => {
      const optionalItems = (b.optionalAmenities || []).map((x) => ({
        name: x.optionalAmenity?.name || 'Unknown',
        quantity: x.quantity || 0,
      }));
      const rentalItems = (b.rentalAmenities || []).map((x) => ({
        name: x.rentalAmenity?.name || 'Unknown',
        quantity: x.quantity || 0,
        hoursUsed: x.hoursUsed ?? null,
      }));

      const optionalCount = optionalItems.reduce((s, i) => s + (i.quantity || 0), 0);
      const rentalCount = rentalItems.reduce((s, i) => s + (i.quantity || 0), 0);
      return {
        bookingId: b.id,
        bookingDate: b.checkIn,
        checkoutDate: b.checkOut,
        guestFirstName: b.user?.firstName || (b.guestName ? String(b.guestName).split(' ')[0] : null),
        guestLastName: b.user?.lastName || (b.guestName ? String(b.guestName).split(' ').slice(1).join(' ') : null),
        categoriesUsed: [
          optionalItems.length ? 'Optional' : null,
          rentalItems.length ? 'Rental' : null,
        ].filter(Boolean),
        counts: { optional: optionalCount, rental: rentalCount },
        optionalItems,
        rentalItems,
      };
    });

    return NextResponse.json(results);
  } catch (err) {
    console.error('❌ Usage logs GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
