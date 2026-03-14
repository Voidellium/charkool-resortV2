import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Helper to serialize BigInt
function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    // Normalize end to end of day
    end.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
      where: {
        isDeleted: false,
        checkIn: {
          gte: start,
          lte: end
        }
      },
      include: {
        user: true,
        rooms: { include: { room: true } },
        payments: true,
        amenities: { include: { amenity: true } },
        optionalAmenities: { include: { optionalAmenity: true } },
        rentalAmenities: { include: { rentalAmenity: true } },
        cottage: { include: { cottage: true } },
      },
      orderBy: { checkIn: 'asc' }
    });

    const processed = bookings.map(booking => {
      // compute totals similar to /api/bookings
      let rentalTotal = 0;
      if (booking.rentalAmenities && Array.isArray(booking.rentalAmenities)) {
        rentalTotal = booking.rentalAmenities.reduce((s, ra) => s + (typeof ra.totalPrice === 'bigint' ? Number(ra.totalPrice) : (ra.totalPrice || 0)), 0);
      }
      let cottageTotal = 0;
      if (booking.cottage && Array.isArray(booking.cottage)) {
        cottageTotal = booking.cottage.reduce((s, c) => s + (typeof c.totalPrice === 'bigint' ? Number(c.totalPrice) : (c.totalPrice || 0)), 0);
      }
      const basePrice = typeof booking.totalPrice === 'bigint' ? Number(booking.totalPrice) : (booking.totalPrice || 0);
      const totalCostWithAddons = basePrice + rentalTotal + cottageTotal;

      if (!totalCostWithAddons || Number(totalCostWithAddons) === 0) {
        console.warn('Upcoming booking has totalCostWithAddons === 0', { id: booking.id, guestName: booking.guestName, checkIn: booking.checkIn });
      }

      const totalPaid = (booking.payments || []).reduce((s, p) => {
        if (!p) return s;
        let amt = typeof p.amount === 'bigint' ? Number(p.amount) : (p.amount || 0);
        if (amt > 1000000) amt = Math.floor(amt / 100);
        const status = (p.status || '').toLowerCase();
        return (status === 'paid' || status === 'partial' || status === 'reservation' || status === 'completed') ? s + amt : s;
      }, 0);

      const roomsCount = (booking.rooms || []).reduce((s, r) => s + (Number(r.quantity) || 0), 0);
      const reservationThresholdCents = roomsCount * 2000 * 100;

      let paymentOption = 'Unpaid';
      if (totalPaid >= totalCostWithAddons) paymentOption = 'Paid';
      else if (totalPaid >= reservationThresholdCents) paymentOption = 'Reservation';

      const balancePaid = totalPaid;
      const balanceToPay = totalCostWithAddons - totalPaid;

      return {
        ...booking,
        totalCostWithAddons,
        totalPaid: balancePaid,
        balancePaid,
        balanceToPay,
        paymentOption,
      };
    });

    return NextResponse.json(serializeBigInt(processed));
  } catch (error) {
    console.error('GET /api/bookings/upcoming error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
