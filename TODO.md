# TODO for PayMongo SDK Integration and Checkout Page Update

- [ ] Add PayMongo JavaScript SDK as a project dependency.
- [ ] Update the checkout page to integrate PayMongo SDK:
  - Initialize PayMongo client with the client_key from payment creation API.
  - Use PayMongo SDK to show payment modal or collect payment method.
  - Handle payment confirmation and redirect on success or failure.
- [ ] Test the full booking and payment flow with the new integration.
- [ ] Verify error handling and edge cases in payment flow.
- [ ] Ensure the payment history in GuestDashboard displays correctly.
- [ ] Remove any old redirect logic from checkout page.

Next steps:
- Install PayMongo SDK dependency.
- Implement checkout page integration.
- Run tests and verify functionality.
