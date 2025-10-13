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
      select: { rooms: { select: { roomId: true } }, checkIn: true, checkOut: true },
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

    // Collect checkOut dates for turnover logic
    const checkOutDates = new Set();
    overlappingBookings.forEach(booking => {
      const checkOutStr = formatDate(new Date(booking.checkOut));
      checkOutDates.add(checkOutStr);
    });

    // Step 4: Calculate availability per date (true if rooms available)
    const availability = {};
    Object.entries(dateCounts).forEach(([dateStr, bookedCount]) => {
      let isAvailable = bookedCount < rooms.length;

      // Turnover logic: Block checkOut day until 2pm (14:00)
      if (checkOutDates.has(dateStr) && now.getHours() < 14) {
        // Treat as fully booked during turnover window
        isAvailable = false;
      }

      availability[dateStr] = isAvailable;
    });

    // Step 5: Handle room release and availability timing
    const releaseTime = new Date(now);
    releaseTime.setHours(12, 0, 0, 0); // Set to 12 PM

    const availableTime = new Date(now);
    availableTime.setHours(14, 0, 0, 0); // Set to 2 PM

    Object.entries(dateCounts).forEach(([dateStr, bookedCount]) => {
      let isAvailable = bookedCount < rooms.length;

      // Check if the current date matches the release time
      if (new Date(dateStr).getTime() === releaseTime.getTime()) {
        isAvailable = false; // Room is being released
      }

      // Check if the current date matches the available time
      if (new Date(dateStr).getTime() === availableTime.getTime()) {
        isAvailable = true; // Room becomes available
      }

      availability[dateStr] = {
        isAvailable,
        availableRooms: rooms.length - bookedCount,
      };
    });

    // Step 6: Implement timer logic for check-in and check-out
    overlappingBookings.forEach(booking => {
      const checkInDate = new Date(booking.checkIn);
      const checkOutDate = new Date(booking.checkOut);

      // Set timers for check-in and check-out
      const checkInTimer = new Date(checkInDate);
      checkInTimer.setHours(14, 0, 0, 0); // 2 PM on check-in day

      const checkOutTimer = new Date(checkOutDate);
      checkOutTimer.setHours(12, 0, 0, 0); // 12 noon on check-out day

      // Logic to release room at 12 noon and make it available at 2 PM
      if (now >= checkOutTimer && now < checkOutTimer.setHours(14)) {
        availability[formatDate(checkOutDate)] = {
          isAvailable: false,
          availableRooms: rooms.length - dateCounts[formatDate(checkOutDate)],
        };
      } else if (now >= checkOutTimer.setHours(14)) {
        availability[formatDate(checkOutDate)] = {
          isAvailable: true,
          availableRooms: rooms.length,
        };
      }
    });

    // Step 7: Also return available rooms as before
    const bookedRoomIds = overlappingBookings.flatMap(b => b.rooms.map(r => r.roomId));
    const availableRooms = rooms.filter(r => !bookedRoomIds.includes(r.id));

    // Step 8: Handle pending bookings that have passed their check-in and check-out dates
    overlappingBookings.forEach(booking => {
      const checkInDate = new Date(booking.checkIn);
      const checkOutDate = new Date(booking.checkOut);

      if (booking.status === 'Pending' && now > checkOutDate) {
        // Return room quantity and mark as available
        availability[formatDate(checkOutDate)] = {
          isAvailable: true,
          availableRooms: rooms.length,
        };
      }
    });

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
