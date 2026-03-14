/**
 * Room Unit Availability Helper Functions
 * 
 * These functions handle checking and managing room unit availability
 * for the new unit assignment system.
 */

import prisma from '@/lib/prisma';

/**
 * Get all available room units for a specific room type and date range
 * 
 * @param {number} roomId - The room ID
 * @param {Date} checkIn - Check-in date
 * @param {Date} checkOut - Check-out date
 * @returns {Promise<number[]>} Array of available unit numbers (e.g., [1, 2, 4])
 */
export async function getAvailableRoomUnits(roomId, checkIn, checkOut) {
  try {
    // Get the room to find total quantity
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { quantity: true }
    });

    if (!room) {
      throw new Error(`Room with ID ${roomId} not found`);
    }

    // Generate array of all possible unit numbers: [1, 2, 3, ..., quantity]
    const allUnits = Array.from({ length: room.quantity }, (_, i) => i + 1);

    // Find all booked units for overlapping dates
    const bookedAssignments = await prisma.roomUnitAssignment.findMany({
      where: {
        roomId: roomId,
        booking: {
          // Check for date overlap
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
          // Exclude cancelled bookings
          status: {
            not: 'Cancelled'
          }
        }
      },
      select: {
        unitNumber: true
      }
    });

    // Extract booked unit numbers and convert to integers
    const bookedUnitNumbers = bookedAssignments.map(a => parseInt(a.unitNumber));

    // Available units = All units - Booked units
    const availableUnits = allUnits.filter(unit => !bookedUnitNumbers.includes(unit));

    return availableUnits;
  } catch (error) {
    console.error('Error getting available room units:', error);
    throw error;
  }
}

/**
 * Check if a specific room unit is available for the given dates
 * 
 * @param {number} roomId - The room ID
 * @param {string|number} unitNumber - The unit number to check
 * @param {Date} checkIn - Check-in date
 * @param {Date} checkOut - Check-out date
 * @returns {Promise<boolean>} True if available, false otherwise
 */
export async function isRoomUnitAvailable(roomId, unitNumber, checkIn, checkOut) {
  try {
    const unitNumberStr = String(unitNumber);

    // Check for any conflicting bookings
    const conflicts = await prisma.roomUnitAssignment.findMany({
      where: {
        roomId: roomId,
        unitNumber: unitNumberStr,
        booking: {
          // Check for date overlap
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
          // Only active bookings
          status: {
            not: 'Cancelled'
          }
        }
      }
    });

    return conflicts.length === 0;
  } catch (error) {
    console.error('Error checking room unit availability:', error);
    throw error;
  }
}

/**
 * Get available units with their metadata (descriptions, features, etc.)
 * 
 * @param {number} roomId - The room ID
 * @param {Date} checkIn - Check-in date
 * @param {Date} checkOut - Check-out date
 * @returns {Promise<Array>} Array of available units with metadata
 */
export async function getAvailableUnitsWithMetadata(roomId, checkIn, checkOut) {
  try {
    // Get available unit numbers
    const availableUnits = await getAvailableRoomUnits(roomId, checkIn, checkOut);

    if (availableUnits.length === 0) {
      return [];
    }

    // Get metadata for available units
    const metadata = await prisma.roomUnitMetadata.findMany({
      where: {
        roomId: roomId,
        unitNumber: {
          in: availableUnits.map(String)
        },
        isActive: true
      },
      select: {
        unitNumber: true,
        description: true,
        location: true,
        features: true
      }
    });

    // Combine unit numbers with metadata
    const unitsWithMetadata = availableUnits.map(unitNum => {
      const meta = metadata.find(m => m.unitNumber === String(unitNum));
      return {
        unitNumber: unitNum,
        description: meta?.description || null,
        location: meta?.location || null,
        features: meta?.features || []
      };
    });

    return unitsWithMetadata;
  } catch (error) {
    console.error('Error getting available units with metadata:', error);
    throw error;
  }
}

/**
 * Assign a room unit to a booking
 * 
 * @param {number} bookingId - The booking ID
 * @param {number} roomId - The room ID
 * @param {string|number} unitNumber - The unit number to assign
 * @param {number|null} assignedBy - User ID who assigned (null = auto-assigned)
 * @returns {Promise<Object>} The created assignment
 */
export async function assignRoomUnit(bookingId, roomId, unitNumber, assignedBy = null) {
  try {
    const unitNumberStr = String(unitNumber);

    // Verify the booking exists and get dates for validation
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { checkIn: true, checkOut: true }
    });

    if (!booking) {
      throw new Error(`Booking with ID ${bookingId} not found`);
    }

    // Check if unit is still available (race condition protection)
    const isAvailable = await isRoomUnitAvailable(
      roomId, 
      unitNumberStr, 
      booking.checkIn, 
      booking.checkOut
    );

    if (!isAvailable) {
      throw new Error(`Room unit ${unitNumber} is no longer available for the selected dates`);
    }

    // Create the assignment
    const assignment = await prisma.roomUnitAssignment.create({
      data: {
        bookingId,
        roomId,
        unitNumber: unitNumberStr,
        assignedBy
      },
      include: {
        room: {
          select: {
            name: true,
            type: true
          }
        }
      }
    });

    return assignment;
  } catch (error) {
    console.error('Error assigning room unit:', error);
    throw error;
  }
}

/**
 * Auto-assign room units for a booking
 * Assigns the first available unit for each room in the booking
 * Handles multiple instances of the same room type correctly
 * 
 * @param {number} bookingId - The booking ID
 * @param {Array} roomIds - Array of room IDs to assign (can contain duplicates)
 * @returns {Promise<Array>} Array of created assignments
 */
export async function autoAssignRoomUnits(bookingId, roomIds) {
  try {
    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { checkIn: true, checkOut: true }
    });

    if (!booking) {
      throw new Error(`Booking with ID ${bookingId} not found`);
    }

    const assignments = [];
    
    // Track which units have been assigned in this booking to avoid duplicates
    const assignedUnitsPerRoom = {};

    for (const roomId of roomIds) {
      // Initialize tracking for this room if not exists
      if (!assignedUnitsPerRoom[roomId]) {
        assignedUnitsPerRoom[roomId] = [];
      }

      // Get available units
      const availableUnits = await getAvailableRoomUnits(
        roomId,
        booking.checkIn,
        booking.checkOut
      );

      if (availableUnits.length === 0) {
        throw new Error(`No units available for room ID ${roomId}`);
      }

      // Find first available unit that hasn't been assigned in this booking yet
      const unitToAssign = availableUnits.find(
        unit => !assignedUnitsPerRoom[roomId].includes(unit)
      );

      if (!unitToAssign) {
        throw new Error(`No more units available for room ID ${roomId} after assigning ${assignedUnitsPerRoom[roomId].length} unit(s)`);
      }

      // Assign the unit
      const assignment = await assignRoomUnit(
        bookingId,
        roomId,
        unitToAssign,
        null // null = auto-assigned
      );

      // Track this assignment
      assignedUnitsPerRoom[roomId].push(unitToAssign);
      assignments.push(assignment);
    }

    return assignments;
  } catch (error) {
    console.error('Error auto-assigning room units:', error);
    throw error;
  }
}

/**
 * Get unit assignments for a booking
 * 
 * @param {number} bookingId - The booking ID
 * @returns {Promise<Array>} Array of unit assignments with room details
 */
export async function getBookingUnitAssignments(bookingId) {
  try {
    const assignments = await prisma.roomUnitAssignment.findMany({
      where: { bookingId },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return assignments;
  } catch (error) {
    console.error('Error getting booking unit assignments:', error);
    throw error;
  }
}

/**
 * Update/reassign a room unit for a booking
 * 
 * @param {number} assignmentId - The assignment ID to update
 * @param {string|number} newUnitNumber - The new unit number
 * @param {number} assignedBy - User ID who made the reassignment
 * @returns {Promise<Object>} The updated assignment
 */
export async function reassignRoomUnit(assignmentId, newUnitNumber, assignedBy) {
  try {
    const unitNumberStr = String(newUnitNumber);

    // Get existing assignment
    const existingAssignment = await prisma.roomUnitAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        booking: {
          select: { checkIn: true, checkOut: true }
        }
      }
    });

    if (!existingAssignment) {
      throw new Error(`Assignment with ID ${assignmentId} not found`);
    }

    // Check if new unit is available
    const isAvailable = await isRoomUnitAvailable(
      existingAssignment.roomId,
      unitNumberStr,
      existingAssignment.booking.checkIn,
      existingAssignment.booking.checkOut
    );

    if (!isAvailable) {
      throw new Error(`Room unit ${newUnitNumber} is not available for the selected dates`);
    }

    // Update the assignment
    const assignment = await prisma.roomUnitAssignment.update({
      where: { id: assignmentId },
      data: {
        unitNumber: unitNumberStr,
        assignedBy,
        assignedAt: new Date()
      },
      include: {
        room: {
          select: {
            name: true,
            type: true
          }
        }
      }
    });

    return assignment;
  } catch (error) {
    console.error('Error reassigning room unit:', error);
    throw error;
  }
}
