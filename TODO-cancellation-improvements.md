# Cancellation Improvements TODO

## 1. Update Database Schema
- [x] Add "Refunded" and "Failed" to PaymentStatus enum in prisma/schema.prisma
- [x] Run Prisma generate to update client
- [ ] Migration needs to be resolved (drift detected - database has old string values, schema uses enums)

## 2. Enhance Booking Cancellation Logic
- [x] Modify app/api/bookings/[id]/route.js PUT method to:
  - Detect when status is set to "Cancelled"
  - Check if booking has paid payments
  - Automatically trigger refund via /api/payments/refund
  - Send notifications to receptionists and super-admins
  - Handle TEST payment cancellations (set to refunded instead of failed)
- [x] Add validation to prevent cancelling checked-in bookings

## 3. Update Refund API for TEST Payments
- [x] Modify app/api/payments/refund/route.js to handle TEST provider differently
- [x] For TEST payments, skip PayMongo call and directly set status to refunded

## 4. Add Cancellation Policy Text
- [x] Update app/booking/page.js step 4 to include cancellation policy notice

## 5. Testing
- [ ] Test cancellation flow for paid bookings
- [ ] Test cancellation flow for TEST payments
- [ ] Verify notifications are sent
- [ ] Verify refunds are processed correctly
