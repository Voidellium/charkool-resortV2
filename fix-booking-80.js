const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBooking80() {
  try {
    // Get booking 80
    const booking = await prisma.booking.findUnique({
      where: { id: 80 },
      include: { rooms: true }
    });

    if (!booking) {
      console.log('❌ Booking 80 not found');
      return;
    }

    console.log('📦 Current booking data:', booking);

    // Update quantity to 1 for each room that has 0
    for (const room of booking.rooms) {
      if (room.quantity === 0) {
        await prisma.bookingRoom.update({
          where: {
            bookingId_roomId: {
              bookingId: room.bookingId,
              roomId: room.roomId
            }
          },
          data: {
            quantity: 1 // Fix: set to 1 room
          }
        });
        console.log(`✅ Fixed room ${room.roomId}: quantity 0 → 1`);
      }
    }

    // Verify the fix
    const fixed = await prisma.booking.findUnique({
      where: { id: 80 },
      include: { rooms: true }
    });
    console.log('✅ Updated booking data:', fixed);
    console.log(`💰 New expected payment: ${fixed.rooms.reduce((sum, r) => sum + r.quantity, 0) * 2000} pesos`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBooking80();
