# Amenity Management System Implementation

## Database Schema
- [x] Update prisma/schema.prisma to add new Amenity and RoomTypeAmenity models
- [x] Rename existing Amenity to RoomAmenity to avoid conflict
- [x] Generate Prisma migration
- [ ] Run migration

## Data Population
- [ ] Update prisma/seed.js to populate new Amenity table with room_included and optional_extra amenities
- [ ] Populate RoomTypeAmenity table with quantities for each room type

## Backend API Updates
- [ ] Modify app/api/amenities/route.js to return only optional_extra amenities
- [ ] Create new API app/api/amenities/room-included/route.js to fetch room-included amenities by room type
- [ ] Update app/api/bookings/route.js to handle new amenity structure in bookings

## Frontend Booking Page
- [ ] Modify app/booking/page.js to fetch room-included amenities on room type selection (internal)
- [ ] Add new "Optional Amenities" section below main booking form
- [ ] Add cost calculation and display for optional amenities in new summary area
- [ ] Ensure no changes to existing room selection UI

## Admin Panel
- [ ] Create new app/super-admin/amenity-management/page.js for superadmin CRUD
- [ ] Create new app/amenityinventorymanager/amenity-management/page.js for amenity manager
- [ ] Implement CRUD operations for amenities
- [ ] Add functionality to associate amenities with room types

## Testing
- [ ] Test booking flow with new amenities
- [ ] Verify admin CRUD operations
- [ ] Ensure existing functionalities remain unaffected
