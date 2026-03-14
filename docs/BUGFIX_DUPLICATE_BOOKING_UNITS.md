# Bug Fix: Duplicate Booking Units Issue

## Issue Description
When a user selected a specific room unit (e.g., Loft #1) and completed payment, two booking entries appeared in their booking history:
1. **Loft #1** - Payment Status: "Pending"
2. **Loft #2** - Payment Status: "Reservation" (actual booking)

## Root Causes

### 1. Database Schema Constraint Issue
The `RoomUnitAssignment` table had a unique constraint that prevented multiple units of the same room type from being assigned to a single booking:

```prisma
@@unique([bookingId, roomId]) // PROBLEM: Only allows one unit per room type per booking
```

This meant if a user booked 2 Lofts, only one assignment could be created, causing confusion and potential data inconsistencies.

### 2. Auto-Assignment Logic Issue
The auto-assignment code was not properly handling user-selected unit numbers:

```javascript
// OLD CODE - ignored user selections
const roomIdsForAssignment = booking.rooms.map(br => br.roomId);
await autoAssignRoomUnits(booking.id, roomIdsForAssignment);
```

This would:
- Extract room IDs without considering user-selected units
- Pass duplicate room IDs when multiple units of same type were booked
- Auto-assign units regardless of user preferences

### 3. Duplicate Room ID Handling
When the same room type was booked multiple times, the auto-assignment function would assign the same unit multiple times or fail due to the unique constraint.

## Solutions Implemented

### 1. Fixed Database Schema
Updated the unique constraint to allow multiple units of the same room type per booking:

```prisma
model RoomUnitAssignment {
  // ... fields ...
  
  @@unique([bookingId, roomId, unitNumber]) // NEW: Prevents assigning same unit twice
  @@index([bookingId]) // NEW: Added for efficient booking queries
}
```

**Migration Required:** Run `npx prisma migrate dev` to apply this schema change.

### 2. Improved Room Unit Assignment Logic
Updated the booking creation code to:

1. **Check if user selected specific units:**
   - If yes: Create assignments using user-selected unit numbers
   - If no: Use auto-assignment logic

2. **Handle multiple instances of same room type:**
   - Track which units have been assigned during the booking process
   - Ensure each room instance gets a unique unit number

```javascript
// NEW CODE
const hasUserSelectedUnits = hasNewFormat && roomsArray.every(r => r.unitNumber);

if (hasUserSelectedUnits) {
  // User selected specific units - honor their choices
  for (const roomInstance of roomsArray) {
    await assignRoomUnit(booking.id, roomInstance.roomId, roomInstance.unitNumber, null);
  }
} else {
  // No units selected - auto-assign based on availability
  const roomIdsForAssignment = booking.rooms.flatMap(br => 
    Array(br.quantity).fill(br.roomId)
  );
  await autoAssignRoomUnits(booking.id, roomIdsForAssignment);
}
```

### 3. Enhanced Auto-Assignment Function
Updated `autoAssignRoomUnits` to properly handle duplicate room IDs:

```javascript
// Track which units have been assigned in this booking
const assignedUnitsPerRoom = {};

for (const roomId of roomIds) {
  // Find first available unit that hasn't been assigned yet
  const unitToAssign = availableUnits.find(
    unit => !assignedUnitsPerRoom[roomId].includes(unit)
  );
  
  // Assign and track
  assignedUnitsPerRoom[roomId].push(unitToAssign);
  assignments.push(assignment);
}
```

### 4. Updated reassignRoomUnit Function
Changed the function signature to use assignment ID instead of composite key:

```javascript
// OLD: reassignRoomUnit(bookingId, roomId, newUnitNumber, assignedBy)
// NEW: reassignRoomUnit(assignmentId, newUnitNumber, assignedBy)
```

This allows for proper updates when multiple units of the same room type exist.

## Testing Recommendations

1. **Test Case 1: Single Room Booking**
   - Book 1 Loft unit #1
   - Verify only one booking appears
   - Verify unit #1 is assigned

2. **Test Case 2: Multiple Units of Same Type**
   - Book 2 Lofts (unit #1 and unit #2)
   - Verify only one booking appears
   - Verify both units are assigned correctly

3. **Test Case 3: Auto-Assignment**
   - Book 2 Lofts without selecting specific units
   - Verify automatic assignment of available units
   - Verify no duplicates are created

4. **Test Case 4: Mixed Room Types**
   - Book 1 Loft, 1 Tepee, 1 Villa
   - Verify correct assignments for each

## Files Modified

1. `prisma/schema.prisma` - Fixed unique constraint
2. `app/api/bookings/route.js` - Improved assignment logic
3. `src/lib/roomUnitAvailability.js` - Enhanced auto-assignment and updated reassignRoomUnit

## Deployment Steps

1. Backup database
2. Pull latest code
3. Run `npx prisma migrate dev --name fix_room_unit_assignments`
4. Restart application
5. Test booking flow thoroughly

## Impact
- ✅ Fixes duplicate booking display issue
- ✅ Honors user-selected room units
- ✅ Supports multiple units of same room type
- ✅ Maintains data integrity
- ✅ No breaking changes to existing data

## Date
November 13, 2025
