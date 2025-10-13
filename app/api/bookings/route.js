import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAudit } from '@/src/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

// Helper function to serialize BigInt values
function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

export async function GET() {
  try {
    // First, move completed bookings to history
    const now = new Date();
    await prisma.booking.updateMany({
      where: {
        isDeleted: false,
        checkOut: { lt: now },
        status: { in: ['Confirmed', 'Pending', 'Cancelled', 'Held'] },
      },
      data: { isDeleted: true },
    });

    const bookings = await prisma.booking.findMany({
      include: {
        user: true,
        rooms: { include: { room: true } },
        payments: true,
        amenities: { include: { amenity: true } },
        optionalAmenities: { include: { optionalAmenity: true } },
        rentalAmenities: { include: { rentalAmenity: true } },
        cottage: { include: { cottage: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate total cost including rental amenities and cottages for each booking
    bookings.forEach(booking => {
      let rentalTotal = 0;
      if (booking.rentalAmenities && booking.rentalAmenities.length > 0) {
        rentalTotal = booking.rentalAmenities.reduce((sum, ra) => {
          const val = typeof ra.totalPrice === 'bigint' ? Number(ra.totalPrice) : ra.totalPrice || 0;
          return sum + val;
        }, 0);
      }

      let cottageTotal = 0;
      if (booking.cottage && booking.cottage.length > 0) {
        cottageTotal = booking.cottage.reduce((sum, c) => {
          const val = typeof c.totalPrice === 'bigint' ? Number(c.totalPrice) : c.totalPrice || 0;
          return sum + val;
        }, 0);
      }

      const basePrice = typeof booking.totalPrice === 'bigint' ? Number(booking.totalPrice) : booking.totalPrice || 0;
      booking.totalCostWithAddons = basePrice + rentalTotal + cottageTotal;

      // Determine payment option based on total paid amount
      const totalPaid = booking.payments?.reduce((sum, p) => {
        let amt = typeof p.amount === 'bigint' ? Number(p.amount) : p.amount;
        // Normalize payment amount to cents (₱1 = 100 units) if stored in ten-thousandths (₱1 = 10000 units)
        if (amt > 1000000) { // heuristic threshold to detect large values
          amt = Math.floor(amt / 100);
        }
        return (p.status.toLowerCase() === 'paid' || p.status.toLowerCase() === 'partial' || p.status.toLowerCase() === 'reservation') ? sum + amt : sum;
      }, 0) || 0;

      const totalPrice = typeof booking.totalCostWithAddons === 'bigint'
        ? Number(booking.totalCostWithAddons)
        : booking.totalCostWithAddons;

      const reservationFee = 200000; // example reservation fee in cents

      if (totalPaid >= totalPrice) {
        booking.paymentOption = 'Full Payment';
      } else if (totalPaid >= Math.floor(totalPrice / 2)) {
        booking.paymentOption = 'Half Payment';
      } else if (totalPaid >= reservationFee) {
        booking.paymentOption = 'Reservation';
      } else {
        booking.paymentOption = 'Unpaid';
      }

      // Update paymentStatus to include Reservation if applicable
      if (booking.paymentStatus.toLowerCase() === 'pending' && totalPaid >= reservationFee) {
        booking.paymentStatus = 'Reservation';
      }

      // Extract payment methods used
      booking.paymentMethods = [...new Set(booking.payments?.map(p => p.provider) || [])];

      // Calculate balance paid and balance to pay
      booking.balancePaid = totalPaid;
      booking.balanceToPay = totalPrice - totalPaid;
      booking.totalPaid = totalPaid;
    });

    return NextResponse.json(serializeBigInt(bookings));
  } catch (error) {
    console.error('Fetch Bookings Error:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      guestName,
      checkIn,
      checkOut,
      selectedRooms,
      optional,
      rental,
      cottage,
      status = 'Pending',
      paymentStatus = 'Pending',
      userId = null
    } = data;

    if (!guestName || !checkIn || !checkOut || !selectedRooms || Object.keys(selectedRooms).length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: guestName, checkIn, checkOut, selectedRooms' },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)) || 1; // 24-hour blocks

    // Fetch room details for selected rooms
    const roomIds = Object.keys(selectedRooms).map(id => parseInt(id));
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds } }
    });

    // Calculate total price
    let calculatedTotalPrice = 0;
    for (const room of rooms) {
      const qty = selectedRooms[room.id] || 0;
      const price = typeof room.price === 'bigint' ? Number(room.price) : room.price;
      calculatedTotalPrice += price * qty * nights;
    }

    const optionalAmenitiesToCreate = [];
    if (optional && Object.keys(optional).length > 0) {
      const amenityIds = Object.keys(optional).map(id => parseInt(id));
      const amenitiesDetails = await prisma.optionalAmenity.findMany({
        where: { id: { in: amenityIds } },
      });
      for (const amenity of amenitiesDetails) {
        const qty = optional[amenity.id];
        optionalAmenitiesToCreate.push({
          optionalAmenityId: amenity.id,
          quantity: qty,
        });
      }
    }

    const rentalAmenitiesToCreate = [];
    if (rental && Object.keys(rental).length > 0) {
      const amenityIds = Object.keys(rental).map(id => parseInt(id));
      const amenitiesDetails = await prisma.rentalAmenity.findMany({
        where: { id: { in: amenityIds } },
      });

      for (const amenity of amenitiesDetails) {
        const selection = rental[amenity.id];
        let amenityPrice = 0;
        if (selection.hoursUsed > 0 && amenity.pricePerHour) {
          const perHour = typeof amenity.pricePerHour === 'bigint' ? Number(amenity.pricePerHour) : amenity.pricePerHour;
          amenityPrice = selection.hoursUsed * perHour;
        } else {
          const perUnit = typeof amenity.pricePerUnit === 'bigint' ? Number(amenity.pricePerUnit) : amenity.pricePerUnit;
          amenityPrice = selection.quantity * perUnit;
        }
        rentalAmenitiesToCreate.push({
          rentalAmenityId: amenity.id,
          quantity: selection.quantity,
          hoursUsed: selection.hoursUsed,
          totalPrice: amenityPrice,
        });
      }
    }

    const cottageToCreate = [];
    if (cottage && Object.keys(cottage).length > 0) {
      const cottageIds = Object.keys(cottage).map(id => parseInt(id));
      const cottageDetails = await prisma.cottage.findMany({
        where: { id: { in: cottageIds } },
      });
      for (const cot of cottageDetails) {
        const qty = cottage[cot.id];
        const price = typeof cot.price === 'bigint' ? Number(cot.price) : cot.price;
        const totalPrice = price * qty;
        calculatedTotalPrice += totalPrice;
        cottageToCreate.push({
          cottageId: cot.id,
          quantity: qty,
          totalPrice,
        });
      }
    }

    const booking = await prisma.booking.create({
      data: {
        guestName,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        status,
        paymentStatus,
        totalPrice: calculatedTotalPrice,
        userId: userId ? parseInt(userId) : null,
        ...(status === 'Pending' && { heldUntil: new Date(Date.now() + 3 * 60 * 60 * 1000) }),
        optionalAmenities: { create: optionalAmenitiesToCreate },
        rentalAmenities: { create: rentalAmenitiesToCreate },
        cottage: { create: cottageToCreate },
        rooms: {
          create: rooms.map(room => ({
            roomId: room.id,
            quantity: selectedRooms[room.id] || 0,
          })),
        },
      },
      include: {
        rooms: { include: { room: true } },
        optionalAmenities: { include: { optionalAmenity: true } },
        rentalAmenities: { include: { rentalAmenity: true } },
        cottage: { include: { cottage: true } },
      },
    });

    // Create notification for superadmin
    try {
      await prisma.notification.create({
        data: {
          message: `New booking created for ${booking.guestName} from ${new Date(booking.checkIn).toLocaleDateString()} to ${new Date(booking.checkOut).toLocaleDateString()}`,
          type: 'booking_created',
          role: 'superadmin',
        },
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    // Record audit trail for the booking creation
    try {
      // Attempt to resolve server session to capture who created the booking
      const session = await getServerSession(authOptions);
      const detailsObj = {
        summary: `Created booking for ${booking.guestName}`,
        after: booking,
      };
      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || session?.user?.email || booking.guestName,
        actorRole: session?.user?.role || 'GUEST',
        action: 'CREATE',
        entity: 'Booking',
        entityId: String(booking.id),
        details: JSON.stringify(detailsObj),
      });
    } catch (auditErr) {
      console.error('Failed to record audit for booking creation:', auditErr);
    }

    return NextResponse.json({ booking: serializeBigInt(booking) }, { status: 201 });
  } catch (error) {
    console.error('Create Booking Error:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
