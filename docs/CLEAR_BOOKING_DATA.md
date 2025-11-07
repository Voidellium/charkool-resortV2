# Clear Booking Data Scripts

This document explains how to clear booking data from the database without using `prisma db reset`, which would delete ALL data including users, rooms, amenities, etc.

## Overview

Three scripts are provided to safely delete booking-related data:

1. **`scripts/clear-booking-data.js`** - Delete ALL bookings with confirmation prompt
2. **`scripts/clear-booking-data-selective.js`** - Delete bookings by criteria (status, date, etc.)
3. **`prisma/clear-bookings-seed.js`** - Seed-compatible version for quick execution

## What Gets Deleted

Both scripts will delete:
- ✅ All bookings
- ✅ All payments
- ✅ All booking room assignments
- ✅ All booking amenities (optional, rental, cottages)
- ✅ All reschedule requests
- ✅ All booking remarks
- ✅ All booking-related notifications
- ✅ Reset rooms to "available" status

## What Gets Preserved

These scripts will **NOT** delete:
- ❌ Users (guests, admins, super admins)
- ❌ Rooms and room definitions
- ❌ Amenity inventory
- ❌ Optional amenities definitions
- ❌ Rental amenities definitions
- ❌ Cottage definitions
- ❌ System logs
- ❌ Any other non-booking data

## Usage

### Option 1: Using the Standalone Script (Recommended)

This script includes a confirmation prompt for safety.

```powershell
# First, see the warning message
node scripts/clear-booking-data.js

# Then confirm and execute
node scripts/clear-booking-data.js --confirm
```

Or skip the warning:
```powershell
node scripts/clear-booking-data.js -y
```

### Option 2: Using the Selective Deletion Script

Delete bookings based on specific criteria:

```powershell
# View help and options
node scripts/clear-booking-data-selective.js --help

# Delete all cancelled bookings (dry run first)
node scripts/clear-booking-data-selective.js --status=Cancelled

# Confirm and delete
node scripts/clear-booking-data-selective.js --status=Cancelled --confirm

# Delete bookings older than 90 days
node scripts/clear-booking-data-selective.js --older-than-days=90 --confirm

# Delete bookings before a specific date
node scripts/clear-booking-data-selective.js --before=2024-01-01 --confirm

# Delete expired bookings
node scripts/clear-booking-data-selective.js --status=Expired --confirm

# Combine criteria: cancelled bookings from before 2024
node scripts/clear-booking-data-selective.js --status=Cancelled --before=2024-01-01 --confirm
```

**Available Statuses:**
- `Pending`
- `Confirmed`
- `CheckedIn`
- `CheckedOut`
- `Cancelled`
- `Expired`

### Option 3: Using the Seed Script

This executes immediately without confirmation:

```powershell
node prisma/clear-bookings-seed.js
```

### Option 4: Add to package.json Scripts

You can add this to your `package.json` for easier access:

```json
{
  "scripts": {
    "clear-bookings": "node scripts/clear-booking-data.js",
    "clear-bookings:force": "node scripts/clear-booking-data.js --confirm",
    "clear-bookings:selective": "node scripts/clear-booking-data-selective.js",
    "clear-bookings:cancelled": "node scripts/clear-booking-data-selective.js --status=Cancelled --confirm",
    "clear-bookings:old": "node scripts/clear-booking-data-selective.js --older-than-days=90 --confirm"
  }
}
```

Then run:
```powershell
npm run clear-bookings              # Shows warning
npm run clear-bookings:force        # Executes immediately (all bookings)
npm run clear-bookings:selective    # Interactive selective mode
npm run clear-bookings:cancelled    # Delete only cancelled bookings
npm run clear-bookings:old          # Delete bookings older than 90 days
```

## Example Output

```
🗑️  Starting booking data cleanup...

✅ Deleted 15 booking remarks
✅ Deleted 3 reschedule requests
✅ Deleted 47 payments
✅ Deleted 12 booking cottage entries
✅ Deleted 8 booking rental amenities
✅ Deleted 23 booking optional amenities
✅ Deleted 19 booking amenity inventory entries
✅ Deleted 52 booking room entries
✅ Deleted 31 booking notifications
✅ Deleted 45 bookings
✅ Reset 18 rooms to available status

✨ Booking data cleanup completed successfully!

Summary:
  - 45 bookings removed
  - 47 payments removed
  - 52 room assignments removed
  - 62 amenity assignments removed
  - 3 reschedule requests removed
  - 15 booking remarks removed
  - 31 notifications removed
  - 18 rooms reset to available

Done!
```

## When to Use This

Use these scripts when you need to:
- Clear test booking data during development
- Reset the booking system for a new season
- Clean up old or cancelled bookings
- Remove expired or pending bookings that are no longer needed
- Prepare the database for testing
- Remove all booking history while keeping user accounts and room definitions
- Archive old data (delete bookings older than X days/months)

**Use the selective script when:**
- You only want to remove specific bookings (by status, date, etc.)
- You need to clean up cancelled/expired bookings periodically
- You want to maintain recent booking history

**Use the complete deletion script when:**
- You need a complete reset of all booking data
- Starting fresh for a new operational period
- Testing/development purposes

## Safety Features

### Script 1 (`scripts/clear-booking-data.js`)
- Requires `--confirm` or `-y` flag to execute
- Shows detailed warning message
- Provides summary of what will be deleted

### Script 2 (`prisma/clear-bookings-seed.js`)
- Executes immediately (use with caution)
- Best for automated processes or when you're certain

## Advanced: Resetting Amenity Quantities

If you also want to reset amenity stock levels, uncomment the following section in `scripts/clear-booking-data.js`:

```javascript
// Optional: Reset amenity quantities to default (if needed)
const optionalAmenitiesReset = await prisma.optionalAmenity.updateMany({
  data: {
    quantity: 0 // or set to your default stock level
  }
});
console.log(`✅ Reset ${optionalAmenitiesReset.count} optional amenity quantities`);

const rentalAmenitiesReset = await prisma.rentalAmenity.updateMany({
  data: {
    quantity: 0 // or set to your default stock level
  }
});
console.log(`✅ Reset ${rentalAmenitiesReset.count} rental amenity quantities`);
```

## Troubleshooting

### "Foreign key constraint failed"
This means there are dependencies that need to be deleted first. The scripts are designed to delete in the correct order, but if you've customized your schema, you may need to adjust the deletion order.

### "Cannot find module '@prisma/client'"
Run `npx prisma generate` first to generate the Prisma Client.

### Script hangs or times out
Check your database connection in the `.env` file. Ensure `DATABASE_URL` is set correctly.

## Database Backup Recommendation

**Before running these scripts in production**, always create a database backup:

```powershell
# Example for PostgreSQL
pg_dump -U username -d database_name -f backup_before_clear.sql

# Or use your hosting provider's backup tools
```

## Related Commands

```powershell
# Full database reset (deletes EVERYTHING)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate

# View database in Prisma Studio
npx prisma studio

# Run regular seed file
npx prisma db seed
```

## Questions?

If you encounter issues or need to customize the deletion logic, check:
- `prisma/schema.prisma` for the database schema
- Foreign key relationships between models
- The order of deletion in the scripts
