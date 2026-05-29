# Promotion Discount Implementation Plan

## Goal
Make promotions real, not just promotional UI. A logged-in customer should be able to avail an active promotion during booking, the booking total should reflect the discount, and staff roles should be able to see clearly whether a booking is discounted and how much discount was applied.

## Current State From Code Scan

- Promotions already exist as database records in `Promotion` with `discountType`, `discountValue`, `targetType`, `isActive`, `startDate`, and `endDate`.
- The landing page and guest dashboard only display promotions through `PromotionPopup` and a promotions fetch.
- The booking total calculator currently sums rooms, rentals, and cottage charges only. It does not read promotions.
- Booking creation stores `totalPrice` and payment-related status, but there is no booking-level discount field in the schema yet.
- Cashier and superadmin booking/payment views already read `totalPrice`, `totalCostWithAddons`, `paymentStatus`, and balance data, so they can be extended to show discount information without redesigning the whole stack.

Relevant current surfaces:

- [prisma/schema.prisma](c:\Users\alixer\charkool-resort\prisma\schema.prisma)
- [app/api/promotions/route.js](c:\Users\alixer\charkool-resort\app\api\promotions\route.js)
- [components/PromotionPopup.js](c:\Users\alixer\charkool-resort\components\PromotionPopup.js)
- [app/api/bookings/calculate-total/route.js](c:\Users\alixer\charkool-resort\app\api\bookings\calculate-total\route.js)
- [app/api/bookings/route.js](c:\Users\alixer\charkool-resort\app\api\bookings\route.js)
- [app/api/payments/create/route.js](c:\Users\alixer\charkool-resort\app\api\payments\create\route.js)
- [app/booking/page.js](c:\Users\alixer\charkool-resort\app\booking\page.js)
- [app/guest/dashboard/page.js](c:\Users\alixer\charkool-resort\app\guest\dashboard\page.js)
- [app/cashier/page.js](c:\Users\alixer\charkool-resort\app\cashier\page.js)
- [app/receptionist/page.js](c:\Users\alixer\charkool-resort\app\receptionist\page.js)
- [app/super-admin/bookings/page.js](c:\Users\alixer\charkool-resort\app\super-admin\bookings\page.js)
- [app/super-admin/payments/page.js](c:\Users\alixer\charkool-resort\app\super-admin\payments\page.js)

## Recommended Product Decision

Treat promotions as booking-level discounts first.

That means:

- The promotion is applied once to the booking total, not separately per payment transaction.
- The discounted amount becomes the authoritative amount due for customer checkout, cashier verification, and superadmin review.
- Room/amenity-target promotions can still exist later, but the first implementation should focus on `targetType = booking` because the current pricing system already calculates a single booking total.

If you want room- or amenity-scoped discounts later, that should be a second phase because it needs line-item allocation rather than a simple total reduction.

## Data Model Plan

The `Booking` model needs discount persistence so every role can tell whether a booking is discounted.

Recommended fields to add to `Booking`:

- `promotionId` or `appliedPromotionId` to link the booking to the promotion used.
- `discountLabel` to store the promo title as a snapshot, so old bookings still display the original name even if the promotion gets edited later.
- `discountTypeSnapshot` and `discountValueSnapshot` to preserve what was applied at booking time.
- `discountAmount` to store the actual cents removed from the total.
- `totalBeforeDiscount` to store the original booking amount before discount.
- `totalAfterDiscount` to store the final booking total after discount.
- `discountAppliedAt` to store when the promotion was applied.
- `discountAppliedByRole` or `discountAppliedById` if staff or cashier can apply/override a discount later.

Optional, but cleaner long-term:

- Create a separate `BookingPromotion` or `PromotionRedemption` table if you want audit history, multiple promo attempts, or future stacking rules.

Why this is needed:

- `totalPrice` is currently used everywhere as a plain price field.
- If you overwrite it with discounted values, you lose the original amount and make audit/recovery harder.
- Storing both before/after values keeps the UI, accounting, and audit trail consistent.

## Booking Flow Plan

### Guest booking page

The guest booking page should become the place where a logged-in customer actively avails the discount.

Recommended UX:

- Show active promotions in the booking flow, not only on the landing page popup.
- If the customer is eligible for a booking-wide promotion, show an `Apply Promotion` action near the price summary.
- Show a visible before/after breakdown:
  - Base booking total
  - Discount amount
  - Final total
- If no promotion is applied, show `No discount applied` rather than hiding the state.

Best practice for how the customer avails it:

- For now, select one active booking promotion from a list.
- Do not rely only on the promotional popup on the home page, because a popup is informational and can be dismissed.
- The booking page should re-fetch promotions and let the user explicitly apply one before confirming the booking.

### Booking submission

When the customer submits the booking:

- The client sends the selected promotion ID, if any.
- The server validates that the promotion is active, not expired, and has a target compatible with the booking.
- The server calculates the discount from the booking total, not from any client-supplied discounted amount.
- The server persists both original and discounted totals.

This is important because the client should never be trusted to submit the discounted price directly.

## Backend Calculation Plan

The booking total calculator in [app/api/bookings/calculate-total/route.js](c:\Users\alixer\charkool-resort\app\api\bookings\calculate-total\route.js) should remain the source of the pre-discount total.

Recommended backend flow:

1. Keep the current price calculation for rooms, rentals, and cottage as the base total.
2. Introduce a separate promo validation and application step after the base total is computed.
3. Apply only one promotion at a time initially.
4. Compute the discount in cents.
5. Return a structured response with both base and final totals.

Suggested response shape from the calculator or booking creation endpoint:

- `baseTotal`
- `discountAmount`
- `finalTotal`
- `appliedPromotion` with id, title, discountType, and discountValue snapshot

## Validation Rules

The server should verify:

- Promotion exists.
- Promotion is active.
- Current date is within `startDate` and `endDate`.
- Promotion target type is allowed for the current booking.
- The promotion has not already been used in a way you want to restrict.

Recommended initial rule set:

- Apply only promotions with `targetType = booking` to the whole booking total.
- For `percentage`, discount amount = base total × percentage.
- For `fixed`, discount amount = the fixed cent amount, capped at the base total.

## Payment Flow Plan

The payment flow should not recalculate the discount as a separate business rule. It should read the booking’s persisted discounted total.

### Customer payment

- If the booking is already discounted, the payment provider should charge the discounted total.
- The payment record should store the amount actually charged.
- The receipt should show base total, discount, and final total.

### Cashier / superadmin payment review

Cashier and superadmin need to see whether a booking is discounted and by how much.

Recommended display in payment details:

- Promotion title
- Base total
- Discount amount
- Final amount due
- Payment amount received
- Remaining balance

Recommended policy:

- Cashier should be able to view the discount and collect the already-discounted amount.
- Superadmin should be able to override or grant manual adjustments if business rules allow it.
- Any override should be audited.

Important distinction:

- The discount should be attached to the booking, not just to an individual payment transaction.
- Payments can be partial, but the discounted booking total remains the authoritative amount due.

## Visibility Plan By Role

### Customer

- Sees active promotions on the website and in the booking flow.
- Sees whether the booking has a discount applied.
- Sees the price breakdown before and after discount.

### Receptionist

- Sees the booking discount status in booking details.
- Sees the original and final totals when helping the guest.
- Does not need the ability to create promo discounts.

### Cashier

- Sees the discounted amount due during payment collection.
- Sees the promotion title and discount amount in payment details.
- Can verify that the charged amount matches the discounted total.

### Superadmin

- Creates and edits promotions.
- Sees discount metadata across bookings and payments.
- Can audit promo creation and promo application.
- Can optionally override discounts if you choose to allow it later.

## UI Plan By Screen

### Landing page

- Keep the promo popup, but treat it as discovery only.
- Add a clear call to action such as `Book now to apply this offer` if eligible.

### Guest dashboard

- Show promotion status inside booking details.
- Add a small `Discount applied` badge when present.
- Show a breakdown card with before/after totals.

### Booking page

- Add a promo selector or `Apply promotion` section.
- Show eligibility rules if the promo cannot be used.
- Recalculate totals live after applying a promotion.

### Cashier page

- Display `Base total`, `Discount`, `Final total`, and `Amount due`.
- Prevent accidental charging of the pre-discount amount if a promo is attached.

### Receptionist page

- Display discount status read-only.
- Use it for guest assistance and confirmation only.

### Superadmin booking and payment pages

- Show discount metadata in table rows, detail modals, and history views.
- Add a filter for discounted vs non-discounted bookings if useful.

## API / Service Plan

Recommended new or updated endpoints:

- A promotion validation endpoint for the booking page.
- A booking discount application path that accepts a promotion ID and recalculates the final booking total server-side.
- A read endpoint on booking details that returns the applied promotion snapshot and discount breakdown.
- Optional staff override endpoint if superadmin or cashier manual discount adjustments are allowed later.

Existing routes that should be updated:

- [app/api/bookings/calculate-total/route.js](c:\Users\alixer\charkool-resort\app\api\bookings\calculate-total\route.js)
- [app/api/bookings/route.js](c:\Users\alixer\charkool-resort\app\api\bookings\route.js)
- [app/api/bookings/[id]/route.js](c:\Users\alixer\charkool-resort\app\api\bookings\[id]\route.js)
- [app/api/payments/create/route.js](c:\Users\alixer\charkool-resort\app\api\payments\create\route.js)
- [app/api/payments/update/route.js](c:\Users\alixer\charkool-resort\app\api\payments\update\route.js)
- [app/api/cashier/verify/route.js](c:\Users\alixer\charkool-resort\app\api\cashier\verify\route.js)

## Audit / Compliance Plan

Because discounts are financial data, every important action should be audited.

Audit events to record:

- Promotion created / edited / activated / deactivated.
- Promotion applied to a booking.
- Promotion removed from a booking.
- Discount overridden by staff.
- Payment created against a discounted booking.

Include in audit payload:

- Booking ID
- Promotion ID
- Promotion title snapshot
- Base total
- Discount amount
- Final total
- Actor role and actor name

## Edge Cases To Decide Before Coding

- Can more than one promotion be applied to a booking?
- Can a promotion be applied automatically, or must the guest explicitly choose it?
- If a promotion is fixed amount and exceeds the booking total, do we cap at zero or reject it?
- Can a promotion target room or amenity lines, or only whole-booking totals in phase one?
- If a booking is edited after the discount is applied, do we re-evaluate the promotion automatically?
- If a cashier manually adjusts a payment, do we also alter the booking discount record or only the payment amount?

## Recommended Phased Delivery

### Phase 1

- Add booking discount fields to the schema.
- Apply booking-target promotions to the booking total server-side.
- Show discount status in guest booking details and all staff detail views.
- Use the discounted total in payment creation and verification.

### Phase 2

- Add room-target and amenity-target support.
- Add a reusable promo selector component.
- Add reporting/filtering for discounted bookings.

### Phase 3

- Add manual override workflows for superadmin and cashier.
- Add redemption history and promo analytics.
- Add coupon-style user entry if you want guests to type a promo code instead of only selecting one.

## Implementation Order I Recommend

1. Extend the `Booking` schema with discount fields and create a migration.
2. Add server-side promotion validation and discount calculation.
3. Wire the guest booking page to select/apply a promotion.
4. Update booking creation and payment creation so they use the persisted final total.
5. Show discount metadata in guest dashboard, receptionist, cashier, and superadmin views.
6. Add audit trail entries for promotion application and overrides.

## Summary

The cleanest design is to treat the promotion as part of the booking record, not as a one-off UI decoration. That makes the discount visible everywhere it matters, keeps the payment amount consistent, and gives all staff roles a reliable way to see whether a booking was discounted.