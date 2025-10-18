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

export async function GET(request) {
  try {
    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;
    
    // Get total count for pagination info
    const totalBookings = await prisma.booking.count({
      where: { isDeleted: false }
    });
    
    const bookings = await prisma.booking.findMany({
      where: { isDeleted: false },
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
      skip: skip,
      take: limit
    });

    // Calculate total cost including rental amenities and cottages for each booking
    bookings.forEach((booking, index) => {
      try {
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

      // Reservation fee threshold: ₱2000 per room unit booked (in cents)
      const roomsCount = Array.isArray(booking.rooms)
        ? booking.rooms.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)
        : 0;
      const reservationThresholdCents = roomsCount * 2000 * 100;

      if (totalPaid >= totalPrice) {
        booking.paymentOption = 'Paid';
      } else if (totalPaid >= reservationThresholdCents) {
        booking.paymentOption = 'Reservation';
      } else {
        booking.paymentOption = 'Unpaid';
      }

      // Update paymentStatus to include Reservation if applicable
      if (booking.paymentStatus.toLowerCase() === 'pending' && totalPaid >= reservationThresholdCents) {
        booking.paymentStatus = 'Reservation';
      }

      // Extract payment methods used
      booking.paymentMethods = [...new Set(booking.payments?.map(p => p.provider) || [])];

      // Calculate balance paid and balance to pay
      booking.balancePaid = totalPaid;
      booking.balanceToPay = totalPrice - totalPaid;
      booking.totalPaid = totalPaid;
      
    } catch (error) {
      console.error(`Error processing booking ${booking.id}:`, error);
      throw new Error(`Failed to process booking ${booking.id}: ${error.message}`);
    }
    });

    const serializedBookings = serializeBigInt(bookings);
    
    // Return paginated response
    return NextResponse.json({
      bookings: serializedBookings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalBookings / limit),
        totalBookings: totalBookings,
        hasNextPage: page < Math.ceil(totalBookings / limit),
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Fetch Bookings Error:', error);
    
    // Return more detailed error information in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorResponse = {
      error: 'Failed to fetch bookings',
      ...(isDevelopment && {
        details: error.message,
        name: error.name
      })
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
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
    // Cooldown enforcement: for customer-initiated bookings (has userId)
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
      if (user) {
        const now = new Date();
        if (user.paymentCooldownUntil && new Date(user.paymentCooldownUntil) > now) {
          const waitMs = new Date(user.paymentCooldownUntil).getTime() - now.getTime();
          return NextResponse.json({
            error: 'Booking temporarily disabled due to repeated failed payments',
            cooldownUntil: user.paymentCooldownUntil,
            failedPaymentAttempts: user.failedPaymentAttempts || 0,
          }, { status: 429 });
        }
      }
    }


    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)) || 1; // 24-hour blocks

    // Fetch room details for selected rooms
    const roomIds = Object.keys(selectedRooms).map(id => parseInt(id));
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds } }
    });

    // Validate room availability for the selected dates
    const now = new Date();
    for (const room of rooms) {
      const requestedQty = selectedRooms[room.id] || 0;
      
      // Check existing bookings that overlap with the requested dates
      const overlappingBookings = await prisma.booking.findMany({
        where: {
          rooms: {
            some: {
              roomId: room.id
            }
          },
          checkIn: { lte: checkOutDate },
          checkOut: { gte: checkInDate },
          status: {
            in: ['Pending', 'Confirmed', 'Held']
          },
          OR: [
            { heldUntil: null },
            { heldUntil: { gt: now } }
          ]
        },
        include: {
          rooms: {
            where: { roomId: room.id }
          }
        }
      });

      const bookedQty = overlappingBookings.reduce((sum, booking) => {
        return sum + booking.rooms.reduce((roomSum, bookingRoom) => {
          return roomSum + bookingRoom.quantity;
        }, 0);
      }, 0);

      const availableQty = room.quantity - bookedQty;
      
      if (requestedQty > availableQty) {
        return NextResponse.json({ 
          error: `Room "${room.name}" has only ${availableQty} units available for the selected dates. You requested ${requestedQty}.` 
        }, { status: 400 });
      }
    }

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

    // Reserve stock and create booking in a single transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Validate and decrement Optional Amenity stock
      for (const item of optionalAmenitiesToCreate) {
        const updated = await tx.optionalAmenity.updateMany({
          where: { id: item.optionalAmenityId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new Error(`Insufficient stock for optional amenity ID ${item.optionalAmenityId}`);
        }
      }

      // Validate and decrement Rental Amenity stock
      for (const item of rentalAmenitiesToCreate) {
        const updated = await tx.rentalAmenity.updateMany({
          where: { id: item.rentalAmenityId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new Error(`Insufficient stock for rental amenity ID ${item.rentalAmenityId}`);
        }
      }

      const created = await tx.booking.create({
        data: {
          guestName,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          status,
          paymentStatus,
          totalPrice: calculatedTotalPrice,
          userId: userId ? parseInt(userId) : null,
          // Hold inventory for 15 minutes pending reservation payment
          ...(status === 'Pending' && { heldUntil: new Date(Date.now() + 15 * 60 * 1000) }),
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

      return created;
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
    const msg = typeof error?.message === 'string' && error.message.startsWith('Insufficient stock')
      ? error.message
      : 'Failed to create booking';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
