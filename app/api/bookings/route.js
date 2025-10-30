import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAudit } from '@/src/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { withSecurity, validateNumber, validateObject } from '@/lib/security';

// Helper function to serialize BigInt values
function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

async function getBookingsHandler(request) {
  try {
    // Get and validate query parameters for pagination
    const { searchParams } = new URL(request.url);
    
    // Validate page parameter
    const pageParam = searchParams.get('page');
    const pageValidation = validateNumber(pageParam || '1', { min: 1, max: 1000, integer: true });
    const page = pageValidation.isValid ? pageValidation.value : 1;
    
    // Validate limit parameter
    const limitParam = searchParams.get('limit');
    const limitValidation = validateNumber(limitParam || '20', { min: 1, max: 100, integer: true });
    const limit = limitValidation.isValid ? limitValidation.value : 20;
    
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const skip = (page - 1) * limit;
    
    // Build where clause based on includeDeleted parameter
    const whereClause = includeDeleted ? {} : { isDeleted: false };
    
    // Get total count for pagination info
    const totalBookings = await prisma.booking.count({
      where: whereClause
    });
    
    const bookings = await prisma.booking.findMany({
      where: whereClause,
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
    const processedBookings = [];
    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      try {
        // Validate booking object
        if (!booking || typeof booking !== 'object') {
          console.error(`Invalid booking at index ${i}:`, booking);
          continue; // Skip invalid bookings instead of throwing
        }

        let rentalTotal = 0;
        if (booking.rentalAmenities && Array.isArray(booking.rentalAmenities) && booking.rentalAmenities.length > 0) {
          rentalTotal = booking.rentalAmenities.reduce((sum, ra) => {
            const val = typeof ra.totalPrice === 'bigint' ? Number(ra.totalPrice) : ra.totalPrice || 0;
            return sum + val;
          }, 0);
        }

        let cottageTotal = 0;
        if (booking.cottage && Array.isArray(booking.cottage) && booking.cottage.length > 0) {
          cottageTotal = booking.cottage.reduce((sum, c) => {
            const val = typeof c.totalPrice === 'bigint' ? Number(c.totalPrice) : c.totalPrice || 0;
            return sum + val;
          }, 0);
        }

        const basePrice = typeof booking.totalPrice === 'bigint' ? Number(booking.totalPrice) : booking.totalPrice || 0;
        booking.totalCostWithAddons = basePrice + rentalTotal + cottageTotal;

        // Determine payment option based on total paid amount
        const totalPaid = (booking.payments && Array.isArray(booking.payments)) ? booking.payments.reduce((sum, p) => {
          if (!p || typeof p !== 'object') return sum;
          let amt = typeof p.amount === 'bigint' ? Number(p.amount) : (p.amount || 0);
          // Normalize payment amount to cents (₱1 = 100 units) if stored in ten-thousandths (₱1 = 10000 units)
          if (amt > 1000000) { // heuristic threshold to detect large values
            amt = Math.floor(amt / 100);
          }
          const status = (p.status || '').toLowerCase();
          return (status === 'paid' || status === 'partial' || status === 'reservation') ? sum + amt : sum;
        }, 0) : 0;

        const totalPrice = typeof booking.totalCostWithAddons === 'bigint'
          ? Number(booking.totalCostWithAddons)
          : booking.totalCostWithAddons;

        // Reservation fee threshold: ₱2000 per room unit booked (in cents)
        const roomsCount = (booking.rooms && Array.isArray(booking.rooms))
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
        const paymentStatus = (booking.paymentStatus || '').toLowerCase();
        if (paymentStatus === 'pending' && totalPaid >= reservationThresholdCents) {
          booking.paymentStatus = 'Reservation';
        }

        // Extract payment methods used (use 'method' not 'provider' to show gcash/paymaya/TEST)
        booking.paymentMethods = booking.payments && Array.isArray(booking.payments) 
          ? [...new Set(booking.payments.map(p => p?.method || p?.provider).filter(Boolean))] 
          : [];

        // Calculate balance paid and balance to pay
        booking.balancePaid = totalPaid;
        booking.balanceToPay = totalPrice - totalPaid;
        booking.totalPaid = totalPaid;
        
        processedBookings.push(booking);
      } catch (error) {
        console.error(`Error processing booking ${booking?.id || 'unknown'} at index ${i}:`, error);
        // Continue processing other bookings instead of failing completely
        continue;
      }
    }

    const serializedBookings = serializeBigInt(processedBookings);
    
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

async function postBookingHandler(request) {
  try {
    const body = request.sanitizedBody || await request.json();
    
    // Enhanced input validation
    const schema = {
      guestName: { type: 'string', required: true, options: { minLength: 2, maxLength: 100 } },
      checkIn: { type: 'date', required: true },
      checkOut: { type: 'date', required: true },
      numberOfGuests: { type: 'number', required: false, options: { integer: true, min: 1 } }, // Made optional for new format
      paymentMode: { type: 'string', required: false, options: { enum: ['cash', 'gcash', 'maya', 'card'] } },
      selectedRooms: { type: 'object', required: false }, // Made optional - either this or rooms array
      rooms: { type: 'array', required: false }, // NEW: array of room objects with guest details
      optional: { type: 'object', required: false },
      rental: { type: 'object', required: false },
      cottage: { type: 'object', required: false },
      status: { type: 'string', required: false, options: { maxLength: 20 } },
      paymentStatus: { type: 'string', required: false, options: { maxLength: 20 } },
      userId: { type: 'number', required: false, options: { integer: true, min: 1 } }
    };

    const validation = validateObject(body, schema);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validation.errors },
        { status: 400 }
      );
    }

    const {
      guestName,
      checkIn,
      checkOut,
      numberOfGuests,
      paymentMode,
      selectedRooms,
      rooms: roomsArray, // NEW: rooms array format
      optional,
      rental,
      cottage,
      status = 'Pending',
      paymentStatus = 'Pending',
      userId = null
    } = validation.data;

    // Validate that either selectedRooms or roomsArray is provided
    const hasOldFormat = selectedRooms && typeof selectedRooms === 'object' && Object.keys(selectedRooms).length > 0;
    const hasNewFormat = roomsArray && Array.isArray(roomsArray) && roomsArray.length > 0;
    
    if (!hasOldFormat && !hasNewFormat) {
      return NextResponse.json(
        { error: 'Either selectedRooms (object) or rooms (array) must be provided' },
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
    // Support both old format (selectedRooms object) and new format (roomsArray)
    const roomIds = hasNewFormat 
      ? roomsArray.map(r => parseInt(r.roomId))
      : Object.keys(selectedRooms).map(id => parseInt(id));
    
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds } }
    });

    // Validate room availability for the selected dates
    const now = new Date();
    for (const room of rooms) {
      // Get requested quantity based on format
      const requestedQty = hasNewFormat
        ? roomsArray.find(r => parseInt(r.roomId) === room.id)?.quantity || 0
        : selectedRooms[room.id] || 0;
      
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
      const qty = hasNewFormat
        ? roomsArray.find(r => parseInt(r.roomId) === room.id)?.quantity || 0
        : selectedRooms[room.id] || 0;
      const price = typeof room.price === 'bigint' ? Number(room.price) : room.price;
      calculatedTotalPrice += price * qty * nights;
      
      // Add additional pax fee for new format (one-time fee, not per night)
      if (hasNewFormat) {
        const roomData = roomsArray.find(r => parseInt(r.roomId) === room.id);
        if (roomData && roomData.additionalPax) {
          calculatedTotalPrice += roomData.additionalPax * 40000; // ₱400 in cents per additional pax
        }
      }
    }

    // Collect amenities from the appropriate source based on format
    let optionalAmenitiesToUse = optional || {};
    let rentalAmenitiesToUse = rental || {};
    
    // For new format, aggregate amenities from all rooms
    if (hasNewFormat) {
      optionalAmenitiesToUse = {};
      rentalAmenitiesToUse = {};
      
      for (const roomData of roomsArray) {
        // Aggregate optional amenities
        if (roomData.optionalAmenities) {
          for (const [amenityId, quantity] of Object.entries(roomData.optionalAmenities)) {
            optionalAmenitiesToUse[amenityId] = (optionalAmenitiesToUse[amenityId] || 0) + quantity;
          }
        }
        
        // Aggregate rental amenities
        if (roomData.rentalAmenities) {
          for (const [amenityId, selection] of Object.entries(roomData.rentalAmenities)) {
            if (!rentalAmenitiesToUse[amenityId]) {
              rentalAmenitiesToUse[amenityId] = { quantity: 0, hoursUsed: selection.hoursUsed || 0 };
            }
            rentalAmenitiesToUse[amenityId].quantity += selection.quantity || 0;
          }
        }
      }
    }

    const optionalAmenitiesToCreate = [];
    if (optionalAmenitiesToUse && Object.keys(optionalAmenitiesToUse).length > 0) {
      const amenityIds = Object.keys(optionalAmenitiesToUse).map(id => parseInt(id));
      const amenitiesDetails = await prisma.optionalAmenity.findMany({
        where: { id: { in: amenityIds } },
      });
      for (const amenity of amenitiesDetails) {
        const qty = optionalAmenitiesToUse[amenity.id];
        optionalAmenitiesToCreate.push({
          optionalAmenityId: amenity.id,
          quantity: qty,
        });
      }
    }

    const rentalAmenitiesToCreate = [];
    if (rentalAmenitiesToUse && Object.keys(rentalAmenitiesToUse).length > 0) {
      const amenityIds = Object.keys(rentalAmenitiesToUse).map(id => parseInt(id));
      const amenitiesDetails = await prisma.rentalAmenity.findMany({
        where: { id: { in: amenityIds } },
      });

      for (const amenity of amenitiesDetails) {
        const selection = rentalAmenitiesToUse[amenity.id];
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
    // Create booking with retry logic for transaction failures
    let booking;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        booking = await prisma.$transaction(async (tx) => {
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
              numberOfGuests,
              paymentMode,
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
                create: rooms.map(room => {
                  if (hasNewFormat) {
                    // New format: get data from roomsArray
                    const roomData = roomsArray.find(r => parseInt(r.roomId) === room.id);
                    return {
                      roomId: room.id,
                      quantity: roomData?.quantity || 0,
                      adults: roomData?.adults || 1,
                      additionalPax: roomData?.additionalPax || 0,
                      children: roomData?.children || 0,
                      additionalPaxFee: (roomData?.additionalPax || 0) * 40000, // ₱400 per pax in cents
                    };
                  } else {
                    // Old format: minimal data, default guest values
                    return {
                      roomId: room.id,
                      quantity: selectedRooms[room.id] || 0,
                      adults: 1,
                      additionalPax: 0,
                      children: 0,
                      additionalPaxFee: 0,
                    };
                  }
                }),
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
        }, {
          maxWait: 5000, // Maximum time to wait for a transaction slot (5s)
          timeout: 10000, // Maximum time the transaction can run (10s)
        });
        
        // If we get here, transaction succeeded
        break;
        
      } catch (transactionError) {
        console.error(`Booking transaction attempt ${retryCount + 1} failed:`, transactionError);
        
        // Handle specific Prisma transaction errors
        if (transactionError.code === 'P2028') {
          retryCount++;
          if (retryCount >= maxRetries) {
            return NextResponse.json(
              { error: 'Booking creation temporarily unavailable. Please try again in a few moments.' },
              { status: 503 }
            );
          }
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          continue;
        }
        
        // For other errors, don't retry
        throw transactionError;
      }
    }

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

// Export secured handlers
export const GET = withSecurity(getBookingsHandler);
export const POST = withSecurity(postBookingHandler, { 
  rateLimit: { max: 10, window: 15 * 60 * 1000 }, 
  validateInput: true 
});
