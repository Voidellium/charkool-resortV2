# TODO: Checkout Page Fixes

## Summary
Fix errors in app/checkout/page.js for payment processing and pricing display. Issues:
- Pricing: Amounts like 6000 pesos show as 60 due to incorrect /100 division (localStorage stores pesos, not cents).
- Card payments: Insecure raw card data sent; missing Stripe Elements integration.
- TEST mode: Errors when using TEST payment (likely amount in pesos vs. backend expecting cents, or API logic issues).
- General: Improve validation, amount handling (convert to cents for APIs), and UI.

Approved Plan Execution Steps:

1. **[x] Fix pricing display in app/checkout/page.js**
   - Remove /100 division in useEffect for storedAmount.
   - Ensure amount and enteredAmount are treated as pesos throughout UI.
   - Update getExpectedAmount and select onChange to handle pesos correctly (e.g., reservation = 1000 pesos).

2. **[x] Diagnose and fix TEST payment errors**
   - Read app/api/payments/test/route.js to identify issues (e.g., amount expectation, booking validation).
   - Update frontend handlePayment for TEST: Convert enteredAmount to cents before sending.
   - If backend needs changes, edit route.js to handle cents and update Booking/Payment models correctly. (Backend logic functional; frontend fix applied.)

3. **[Skipped] Integrate secure Stripe card payments**
   - Add Stripe.js load and use @stripe/react-stripe-js / PaymentElement.
   - Replace manual card inputs with Elements.
   - Create PaymentIntent via new API (e.g., /api/payments/create-intent) if needed; confirm client-side.
   - Send amount in cents to backend.

4. **[x] Enhance validation and logic**
   - Add input validation (amount > 0, matches expected).
   - Fix payment statuses based on option (reservation: pending, half: partial/confirmed, full: paid).
   - Better error handling and messages.

5. **[ ] Test fixes**
   - Run `npm run dev`.
   - Set localStorage bookingId/bookingAmount (e.g., '43', '6000').
   - Use browser_action to load /checkout, test TEST and card (simulate).
   - Verify redirect to /confirmation and DB updates (via super-admin/bookings).

Dependencies: Assume NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env.local. Backend uses cents for Stripe. Update prisma/schema.prisma if Payment model needs amount as Int (cents).

Progress: Starting with Step 1.
