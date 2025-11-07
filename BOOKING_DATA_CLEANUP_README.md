# Booking Data Management Scripts - Summary

## Quick Start

### Clear ALL Bookings
```powershell
node scripts/clear-booking-data.js --confirm
```

### Clear Specific Bookings
```powershell
# Delete cancelled bookings
node scripts/clear-booking-data-selective.js --status=Cancelled --confirm

# Delete old bookings (90+ days)
node scripts/clear-booking-data-selective.js --older-than-days=90 --confirm
```

## Files Created

| File | Purpose |
|------|---------|
| `scripts/clear-booking-data.js` | Main script - deletes ALL bookings with safety confirmation |
| `scripts/clear-booking-data-selective.js` | Selective deletion by status, date, user, etc. |
| `prisma/clear-bookings-seed.js` | Seed-compatible version (immediate execution) |
| `scripts/clear-booking-reference.js` | Quick reference guide with code examples |
| `docs/CLEAR_BOOKING_DATA.md` | Full documentation |

## Common Use Cases

### 1. Development/Testing Reset
```powershell
# Clear everything to start fresh
node scripts/clear-booking-data.js --confirm
```

### 2. Periodic Cleanup (Cancelled Bookings)
```powershell
# Remove cancelled bookings
node scripts/clear-booking-data-selective.js --status=Cancelled --confirm
```

### 3. Archive Old Data
```powershell
# Remove bookings older than 6 months (180 days)
node scripts/clear-booking-data-selective.js --older-than-days=180 --confirm
```

### 4. Remove Specific Status
```powershell
# Remove all expired bookings
node scripts/clear-booking-data-selective.js --status=Expired --confirm
```

### 5. Clean Date Range
```powershell
# Remove all bookings from before 2024
node scripts/clear-booking-data-selective.js --before=2024-01-01 --confirm
```

## Safety Features

✅ **Confirmation Required** - Scripts require `--confirm` flag to execute  
✅ **Dry Run Mode** - Selective script shows what will be deleted first  
✅ **Preserves Core Data** - Users, rooms, amenity definitions are never deleted  
✅ **Proper Cascading** - Deletes in correct order to avoid foreign key errors  
✅ **Detailed Logging** - Shows exactly what was deleted  
✅ **Room Status Reset** - Automatically resets rooms to "available"  

## What Gets Deleted

✅ Bookings  
✅ Payments  
✅ Booking room assignments  
✅ Booking amenities (optional, rental, cottages)  
✅ Reschedule requests  
✅ Booking remarks  
✅ Booking notifications  

## What Is Preserved

❌ Users (all roles)  
❌ Rooms & room definitions  
❌ Amenity inventory & definitions  
❌ System logs  
❌ Cottage definitions  
❌ Account settings  

## Adding to package.json (Recommended)

Add these to your `package.json` scripts section:

```json
{
  "scripts": {
    "clear-bookings": "node scripts/clear-booking-data.js",
    "clear-bookings:force": "node scripts/clear-booking-data.js --confirm",
    "clear-bookings:selective": "node scripts/clear-booking-data-selective.js",
    "clear-bookings:cancelled": "node scripts/clear-booking-data-selective.js --status=Cancelled --confirm",
    "clear-bookings:old": "node scripts/clear-booking-data-selective.js --older-than-days=90 --confirm",
    "clear-bookings:expired": "node scripts/clear-booking-data-selective.js --status=Expired --confirm"
  }
}
```

Then use npm commands:
```powershell
npm run clear-bookings              # Safety check
npm run clear-bookings:force        # Delete all
npm run clear-bookings:cancelled    # Delete cancelled only
npm run clear-bookings:old          # Delete old bookings
npm run clear-bookings:expired      # Delete expired only
```

## Automated Cleanup (Optional)

For automated periodic cleanup, you could:

1. **Create a cron job** (Linux/macOS) or **Task Scheduler** (Windows)
2. **Use a cloud scheduler** (if deployed)
3. **Create an API endpoint** that runs the cleanup

Example API endpoint (`app/api/admin/cleanup-bookings/route.js`):
```javascript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(request) {
  // Add authentication check here!
  // Only allow super admin access
  
  try {
    const { olderThanDays, status } = await request.json();
    
    // Build query
    const where = {};
    if (olderThanDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - olderThanDays);
      where.createdAt = { lt: cutoff };
    }
    if (status) {
      where.status = status;
    }
    
    const bookings = await prisma.booking.findMany({ where, select: { id: true } });
    const bookingIds = bookings.map(b => b.id);
    
    // Delete related records...
    // (use code from selective script)
    
    return Response.json({ 
      success: true, 
      deleted: bookingIds.length 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

## Troubleshooting

### Error: "Cannot find module '@prisma/client'"
```powershell
npx prisma generate
```

### Error: "Foreign key constraint failed"
The scripts delete in the correct order. If this happens, check if you've added custom relationships in your schema.

### Script hangs
Check your `DATABASE_URL` in `.env` file.

### Want to customize deletion logic
Edit the scripts in `scripts/` folder to match your needs.

## Important Reminders

⚠️ **ALWAYS BACKUP** your database before running in production  
⚠️ **TEST FIRST** in development environment  
⚠️ **USE SELECTIVE** deletion when possible (safer than deleting everything)  
⚠️ **VERIFY RESULTS** after running scripts  

## Database Backup Commands

```powershell
# PostgreSQL
pg_dump -U username -d database_name -f backup_$(date +%Y%m%d).sql

# Or use your hosting provider's backup tools
# Vercel Postgres, Supabase, Railway, etc. all have backup options
```

## Related Documentation

- Full docs: `docs/CLEAR_BOOKING_DATA.md`
- Schema reference: `prisma/schema.prisma`
- Quick reference: `scripts/clear-booking-reference.js`

## Need Help?

1. Check `docs/CLEAR_BOOKING_DATA.md` for detailed documentation
2. Run scripts with `--help` flag for usage info
3. Review `scripts/clear-booking-reference.js` for code examples
4. Test in development first!
