# Fix Login and Booking Redirect Issues

## Problem Description
- After clicking "booking", user is redirected to login.
- After login, nothing happens (no redirect), user stays on login page.
- User manually navigates to guest dashboard.
- Clicking "book now" from guest dashboard redirects to login again.
- Refreshing the booking page causes server error.

## Root Cause
- Login page relies on useEffect to redirect after credentials login, but session update is not immediate.
- Session persistence issues causing authentication to fail.
- Potential server errors due to improper session access handling.

## Tasks
- [ ] Modify login page to redirect immediately after successful credentials login using router.push with redirect query param.
- [ ] Add better error handling in booking page to prevent server errors when session is loading or unavailable.
- [ ] Ensure OAuth login redirect works properly with callbackUrl.
- [ ] Test the complete flow: booking -> login -> redirect to booking -> proceed with booking.
- [ ] Test guest dashboard "book now" button works without redirecting to login.
- [ ] Verify no server errors on page refresh.
