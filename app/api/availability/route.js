import { PrismaClient, BookingStatus } from '@prisma/client';
const prisma = new PrismaClient();

function formatDate(date) {
  // Timezone-safe date formatting
  if (!date) return null;
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDatesBetween(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);
  while (currentDate < endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

export async function POST(req) {
  try {
    const { checkIn, checkOut } = await req.json();

    if (!checkIn || !checkOut) {
      return new Response(JSON.stringify({ error: 'Missing check-in or check-out date' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const checkInDate = new Date(checkIn + 'T00:00:00');
    const checkOutDate = new Date(checkOut + 'T00:00:00');
    const now = new Date();

  // Step 1: Get all rooms except BEACHFRONT for booking
  const rooms = await prisma.room.findMany({
    where: { type: { not: 'BEACHFRONT' } }
  });

    // Step 2: Get bookings overlapping with the date range
    const overlappingBookings = await prisma.booking.findMany({
      where: {
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
      select: { roomId: true, checkIn: true, checkOut: true },
    });

    // Step 3: Build a map of date string to number of booked rooms
    const dateCounts = {};

    const allDates = getDatesBetween(checkInDate, checkOutDate);
    allDates.forEach(date => {
      const dateStr = formatDate(date);
      dateCounts[dateStr] = 0;
    });

    overlappingBookings.forEach(booking => {
      const bCheckIn = new Date(booking.checkIn);
      const bCheckOut = new Date(booking.checkOut);
      const bookedDates = getDatesBetween(bCheckIn, bCheckOut);
      bookedDates.forEach(date => {
        const dateStr = formatDate(date);
        if (dateCounts[dateStr] !== undefined) {
          dateCounts[dateStr] += 1;
        }
      });
    });

    // Step 4: Calculate availability per date (true if rooms available)
    const availability = {};
    Object.entries(dateCounts).forEach(([dateStr, bookedCount]) => {
      // If bookedCount < total rooms, date is available
      availability[dateStr] = bookedCount < rooms.length;
    });

    // Step 5: Also return available rooms as before
    const bookedRoomIds = overlappingBookings.map(b => b.roomId);
    const availableRooms = rooms.filter(r => !bookedRoomIds.includes(r.id));

    return new Response(JSON.stringify({ availableRooms, availability }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Availability API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
