# Payment Flow Update TODO

## Tasks
- [x] Modify `app/api/payments/redirect/route.js` to send 'returned' status instead of 'success' or 'failed'
- [x] Update `app/checkout/page.js` to handle 'returned' status by polling payment status until confirmed
- [x] Add polling logic in checkout page to check payment status every 2 seconds, up to 30 seconds
- [x] Update UI messages to show "Verifying payment..." during polling
- [x] Ensure popup closes automatically and redirect only on successful payment verification
- [x] Fix BigInt serialization issues in API responses
- [ ] Test the updated payment flow
