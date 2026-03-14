# Cancellation Feature Implementation - Complete

## Overview
The guest booking cancellation feature has been fully implemented, allowing guests to cancel or request cancellation of their bookings based on proximity to check-in date, with appropriate refund policies.

## Implementation Details

### 1. Database Schema (`prisma/schema.prisma`)

#### New Model: CancellationRequest
```prisma
model CancellationRequest {
  id            String              @id @default(cuid())
  bookingId     Int
  booking       Booking            @relation(fields: [bookingId], references: [id])
  userId        String
  user          User               @relation("CancellationRequestsRequested", fields: [userId], references: [id])
  requestedAt   DateTime           @default(now())
  reason        String
  status        CancellationStatus @default(PENDING)
  adminContext  String?
  decidedAt     DateTime?
  decidedById   String?
  decidedBy     User?              @relation("CancellationRequestsDecided", fields: [decidedById], references: [id])
  refundAmount  Float              @default(0)
}
```

#### New Enum: CancellationStatus
- `PENDING` - Request awaiting admin approval
- `APPROVED` - Request approved, booking cancelled
- `DENIED` - Request denied, booking remains active

#### Updated BookingStatus Enum
Added:
- `CancellationPending` - Booking has a pending cancellation request
- `ReschedulePending` - Booking has a pending reschedule request

#### Updated RescheduleRequest Model
Added `autoApproved` field to track one-time auto-approved reschedules after cancellation denial.

### 2. API Endpoints

#### Direct Cancellation (DISABLED)
**Endpoint**: `POST /api/bookings/[id]/cancel`
- **This endpoint is now disabled**
- All cancellations require admin approval
- Returns error directing users to submit a cancellation request instead

#### Cancellation Request (ALL cancellations)
**Endpoint**: `POST /api/bookings/[id]/cancel-request`
- Validates booking ownership
- Checks for existing pending requests
- Creates cancellation request with reason
- Updates booking status to `CancellationPending`
- Creates notification for admin
- **Policy Change**: Now accepts all cancellation requests (not just <7 days)
- Only restriction: Cannot cancel within 24 hours of check-in

#### Batch Fetch Cancellation Requests
**Endpoint**: `GET /api/cancellation-requests/batch?bookingIds=1,2,3`
- Fetches cancellation requests for multiple bookings
- Returns latest request per booking
- Used by guest dashboard for status display

#### Fetch All Cancellation Requests (Admin)
**Endpoint**: `GET /api/cancellation-requests/all`
- Requires SUPERADMIN or ADMIN role
- Returns all cancellation requests with related data
- Ordered by status and request date

#### Approve/Deny Cancellation Request
**Endpoint**: `PATCH /api/cancellation-requests/[id]`
- **APPROVE**: Cancels booking, creates notification (no refund)
- **DENY**: Reverts booking to Confirmed, enables one-time auto-reschedule, creates notification
- Requires admin context for denial

### 3. Frontend Components

#### Modal Components (`components/CustomModals.js`)

**CancelConfirmModal** (DEPRECATED)
- No longer used - direct cancellation is disabled
- All cancellations now go through CancelRequestModal

**CancelRequestModal**
- Collects cancellation reason
- Submits cancellation request for admin approval
- Used for ALL cancellations (1+ days before check-in)

#### Guest Dashboard (`app/guest/dashboard/page.js`)

**Features Added**:
- Cancel button on eligible bookings (Created/Pending/Confirmed status)
- Button disabled 24 hours before check-in
- Pending badge display for CancellationPending status
- All cancellations use CancelRequestModal

**Cancel Button Logic**:
```javascript
- Show for: Created, Pending, Confirmed statuses
- Hide for: Cancelled, Completed, Refunded, NoShow
- Disable if: <24 hours until check-in
- Show pending badge if: CancellationPending status
```

**Cancellation Flow (UPDATED)**:
1. 1+ days before check-in: CancelRequestModal → API call → Awaits admin approval
2. <24 hours: Button disabled

#### Super Admin Page (`app/super-admin/reschedule-cancellation/page.js`)

**Features Added**:
- Cancellation tab alongside Reschedule tab
- Full table view of cancellation requests
- Approve/Deny action buttons
- Updated modals to handle both reschedule and cancellation
- Different messaging for cancellation vs. reschedule
- Automatic refresh after approval/denial

**Table Display**:
- Booking ID
- Guest name and email
- Check-in date
- Cancellation reason
- Request date/time
- Status badge (color-coded)
- Action buttons (for pending requests)

### 4. Policies & Rules

#### Cancellation Policy (UPDATED - March 2026)
- **ALL cancellations require admin approval** - No more direct/automatic cancellations
- **1+ days before check-in**: Submit cancellation request for admin review
- **<24 hours before check-in**: Cancellation disabled

#### Refund Policy
- Refunds are determined by admin during approval process
- No automatic refund calculations

#### Reschedule Policy Changes
- Changed from 14 days to **1 day before check-in**
- Renamed `isWithinTwoWeeks()` to `isWithinOneDay()`

#### One-Time Auto-Reschedule
- Triggered after cancellation request denial
- Guest can reschedule once without admin approval
- Tracked via `autoApproved` field in RescheduleRequest
- Only works for first reschedule after denial

### 5. Notification Messages

#### Direct Cancellation
```
Your booking #[ID] has been cancelled. 
Refund amount: ₱[amount] will be processed within 5-7 business days.
```

#### Cancellation Request Submitted
```
Your cancellation request for booking #[ID] has been submitted 
and is pending admin approval.
```

#### Admin Notification (New Request)
```
New cancellation request from [Guest Name] for booking #[ID] 
requires your approval.
```

#### Request Approved
```
Your cancellation request for booking #[ID] has been approved. 
No refund will be issued as per our cancellation policy 
(within 7 days of check-in).
```

#### Request Denied (with Auto-Reschedule)
```
Your cancellation request for booking #[ID] has been denied.
Reason: [Admin Context]
As a courtesy, you may reschedule this booking one time without 
requiring admin approval.
```

## Testing Checklist

### Guest Dashboard
- [ ] Cancel button appears on Created/Pending/Confirmed bookings
- [ ] Cancel button hidden on Cancelled/Completed/Refunded/NoShow
- [ ] Cancel button disabled <24 hours before check-in
- [ ] Direct cancel modal shows for bookings ≥7 days away
- [ ] Cancel request modal shows for bookings 1-7 days away
- [ ] CancelConfirmModal displays correct refund amount
- [ ] CancelRequestModal requires reason input
- [ ] Direct cancellation updates status to Cancelled
- [ ] Request submission updates status to CancellationPending
- [ ] Pending badge displays during CancellationPending
- [ ] Data refreshes after successful cancel/request

### Super Admin Page
- [ ] Cancellation tab displays all requests
- [ ] Table shows correct request details
- [ ] Status badges color-coded correctly
- [ ] Approve button works for pending requests
- [ ] Deny button requires reason input
- [ ] Approve modal shows cancellation details
- [ ] Deny modal mentions one-time auto-reschedule
- [ ] Approval updates booking to Cancelled
- [ ] Denial reverts booking to Confirmed
- [ ] Notifications sent on approve/deny

### API Endpoints
- [ ] Direct cancel validates ownership
- [ ] Direct cancel calculates 50% refund correctly
- [ ] Request validates no duplicate pending requests
- [ ] Batch fetch returns correct requests
- [ ] Admin fetch requires proper role
- [ ] Approve action cancels booking
- [ ] Deny action enables auto-reschedule
- [ ] All endpoints create proper notifications

### Reschedule Integration
- [ ] Auto-approve works after cancellation denial
- [ ] Auto-approve only works once
- [ ] Reschedule disabled <24 hours before check-in
- [ ] Auto-approved reschedule creates notification

## File Changes Summary

### Created Files
1. `app/api/bookings/[id]/cancel/route.js`
2. `app/api/bookings/[id]/cancel-request/route.js`
3. `app/api/cancellation-requests/batch/route.js`
4. `app/api/cancellation-requests/all/route.js`
5. `app/api/cancellation-requests/[id]/route.js`

### Modified Files
1. `prisma/schema.prisma` - Added CancellationRequest model and enums
2. `components/CustomModals.js` - Added cancel modals and hooks
3. `app/guest/dashboard/page.js` - Full cancellation integration
4. `app/super-admin/reschedule-cancellation/page.js` - Added cancellation handling
5. `app/api/bookings/[id]/reschedule/route.js` - Added auto-approve logic

## Next Steps

1. **Test Complete Flow**: Test end-to-end from guest cancel to admin approval
2. **Database Migration**: Ensure Prisma schema is pushed to production
3. **Notification Testing**: Verify all notification messages are delivered
4. **Edge Cases**: Test concurrent requests, expired bookings, etc.
5. **Documentation**: Update user guides with cancellation instructions

## Notes

- All API endpoints include proper error handling
- Session authentication required for all operations
- Database transactions used for consistency
- Refund processing notification only (actual refund is manual)
- One-time auto-reschedule is a courtesy feature after denial
- Cancel button dynamically calculates days until check-in
- Super admin can see history of approved/denied requests
