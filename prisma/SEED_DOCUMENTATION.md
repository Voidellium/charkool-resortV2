# Prisma Seed Documentation

## Overview
All models in your Prisma schema have corresponding migrations. The database schema is **up to date** with 17 existing migrations.

## Migration Status ✅
- **Status**: All schema models are migrated
- **Total Migrations**: 17
- **Last Migration**: `20251003142756_update_payment_amount_to_bigint`

## Seed File Enhancement

The `prisma/seed.js` file has been enhanced to include comprehensive seed data for all models that require initial data.

### Seeded Models

#### 1. **Users** (All Roles)
- ✅ Super Admin (superadmin@example.com)
- ✅ Admin (admin@example.com)
- ✅ Guest (guest@example.com)
- ✅ Receptionist (receptionist@example.com)
- ✅ Cashier (cashier@example.com)
- ✅ Developer (developer@example.com)
- ✅ Amenity Manager (amenitymanager@example.com)

**Note**: All passwords match the role name + "123" (e.g., `superadmin123`)

#### 2. **Rooms** (With Multiple Units)
- ✅ Loft (₱5,000/night) - 2 units
- ✅ Tepee (₱6,000/night) - 3 units
- ✅ Villa (₱8,000/night) - 2 units
- ✅ Family Lodge (₱16,000/night) - 1 unit

#### 3. **Room Type Default Amenities**
- ✅ Loft: Air conditioning, 2 beds, mini fridge, WiFi, pool & grill access
- ✅ Tepee: Air conditioning, 5 beds, mini fridge, WiFi, pool, gas & stove, grill access
- ✅ Villa: Air conditioning, 10 beds (5 double deck), full fridge, WiFi, pool, gas & stove, grill access
- ✅ Family Lodge: Air conditioning, 12 beds, full fridge, WiFi, pool, 2x gas & stove, grill access

#### 4. **Optional Amenities** (No Additional Cost)
- ✅ Broom & Dustpan
- ✅ Extra Bed (max 2)
- ✅ Extra Pillow (max 5)
- ✅ Extra Blanket (max 3)
- ✅ Towels Set (max 2)
- ✅ Toiletries Kit (max 2)

#### 5. **Rental Amenities** (Paid Per Use)
- ✅ ATV (₱200/hour)
- ✅ Island Hopping (₱600/3pax)
- ✅ Billiard Access (₱150/hour)
- ✅ Karaoke (₱5/song)
- ✅ Banana Boat (₱700/30min)
- ✅ Transportation Service (₱5,000/trip)
- ✅ Kayak Rental (₱300/hour)
- ✅ Snorkeling Gear (₱250/day)

#### 6. **Cottage Add-on**
- ✅ Cottage (₱300 per cottage)

#### 7. **Policies** (6 Policies)
- ✅ Check-in/Check-out Policy
- ✅ Cancellation Policy
- ✅ Reschedule Policy
- ✅ Payment Policy
- ✅ House Rules
- ✅ Damage Policy

#### 8. **Chatbot Q&A** (10 Questions)
- ✅ Booking-related questions (4)
- ✅ Room information (2)
- ✅ Amenities information (2)
- ✅ Payment information (1)
- ✅ General information (2)
- ✅ Activities information (1)

#### 9. **Booking Date Configuration**
- ✅ Max booking months: 2 months ahead
- ✅ Updated by: Super Admin

#### 10. **3D Model Configuration**
- ✅ RESORT_MAP → `/models/resort-map.glb`
- ✅ INTERIOR_TEEPEE → `/models/interior-teepee.glb`
- ✅ INTERIOR_VILLA → `/models/interior-villa.glb`
- ✅ INTERIOR_LOFT → `/models/interior-loft.glb`

#### 11. **Room Unit Metadata** (For Unit Assignment System)
- ✅ Loft: 2 units with descriptions (ground floor, second floor)
- ✅ Tepee: 3 units (beachfront, garden, pool area)
- ✅ Villa: 2 units (ocean view, corner unit)
- ✅ Family Lodge: 1 unit (main building)

#### 12. **Amenity Categories**
- ✅ General
- ✅ Cleaning
- ✅ Bedding
- ✅ Kitchen
- ✅ Entertainment
- ✅ Water Sports
- ✅ Transportation

#### 13. **Promotions** (Active Promotions)
- ✅ Summer Getaway Special (15% off, 3 months)
- ✅ Weekend Warrior Deal (₱500 off, 1 month)
- ✅ Family Package (Free cottage with Family Lodge, 3 months)

#### 14. **Sample Booking**
- ✅ Includes: Room + Optional amenities + Rental amenities + Cottage
- ✅ Demonstrates the complete booking system

### Legacy Support
- ✅ Legacy `Amenity` table (for backward compatibility)
- ✅ Legacy `AmenityInventory` table (for backward compatibility)

## Models That DON'T Need Seeding

These models are transaction/operational data that gets created during normal system operation:

- ❌ **RescheduleRequest** - Created when guests request rescheduling
- ❌ **CancellationRequest** - Created when guests request cancellation
- ❌ **BookingRoom** - Join table for bookings and rooms
- ❌ **BookingOptionalAmenity** - Join table for bookings and optional amenities
- ❌ **BookingRentalAmenity** - Join table for bookings and rental amenities
- ❌ **BookingCottage** - Join table for bookings and cottages
- ❌ **BookingAmenity** - Legacy amenity bookings
- ❌ **Payment** - Created during payment transactions
- ❌ **Notification** - Created by system events
- ❌ **BookingRemark** - Added by staff to bookings
- ❌ **OTP** - Temporary verification codes
- ❌ **Account** - OAuth account linkages
- ❌ **Session** - User sessions
- ❌ **TrustedBrowser** - Browser fingerprints for trusted devices
- ❌ **AuditTrail** - System audit logs
- ❌ **ThreeDModel** - Uploaded 3D models (managed by developers)
- ❌ **SystemLog** - Error and system logs
- ❌ **DisabledBookingDate** - Manually disabled dates
- ❌ **RoomUnitAssignment** - Created during booking confirmation
- ❌ **AmenityLog** - Amenity change logs

## Running the Seed

To run the seed file:

```bash
# Using npm
npm run prisma:seed

# Or directly with Node.js
node prisma/seed.js

# Or using Prisma CLI
npx prisma db seed
```

## Important Notes

1. **Upsert Strategy**: The seed file uses `upsert` for most models to avoid duplicate entries
2. **Idempotent**: Can be run multiple times safely
3. **Sample Data**: Includes a complete sample booking to demonstrate the system
4. **User Passwords**: All test user passwords are in plain text. In production, these should be hashed!
5. **Prices**: All prices are in cents (₱100 = 10000)
6. **Room Quantities**: Rooms have multiple units to support the unit assignment system

## Migration Summary

All 17 migrations are applied:
1. ✅ Initial schema setup
2. ✅ Payment model additions
3. ✅ Booking hold functionality
4. ✅ Room types as enum
5. ✅ Redirect URL for users
6. ✅ User field additions
7. ✅ OTP model
8. ✅ Google OAuth integration
9. ✅ Comprehensive amenity system
10. ✅ Chatbot Q&A model
11. ✅ Trusted browser model
12. ✅ Password reset fields
13. ✅ Optional amenity pricing removal
14. ✅ Payment amount BigInt conversion
15. ✅ (And 3 more migrations)

## Conclusion

✅ **All schema models have migrations**
✅ **Database schema is up to date**
✅ **Comprehensive seed file created with all necessary initial data**
✅ **No additional migration files needed**

The seed file now provides a complete starting dataset for your resort management system!
