# TODO: Add Payment Options to Checkout Page

## Tasks
- [x] Add state for payment option selection (full, half, reservation)
- [x] Add dropdown for payment option
- [x] Calculate expected amount based on payment option (full=amount, half=amount/2, reservation=1000)
- [x] Add input field for user to enter amount to pay
- [x] Add validation to check if entered amount matches expected amount exactly
- [x] Display error message "please enter the exact amount" if validation fails
- [x] Improve UI to look like a payment gateway (professional styling, sections, etc.)
- [x] Use only styled-jsx for styles
- [ ] Test the payment flow with new options

# TODO: Create Unauthorized Page for Role-Based Access

## Tasks
- [x] Create unauthorized page at app/unauthorized/page.js with large text "You are unauthorized to access this account level"
- [x] Add refined UI with centered layout, gradient background, and professional styling
- [x] Add "Back to Login" button that signs out the user using NextAuth and redirects to /login
- [x] Verify middleware redirects unauthorized users to /unauthorized (already implemented)
- [ ] Test unauthorized access to superadmin dashboard with customer role
