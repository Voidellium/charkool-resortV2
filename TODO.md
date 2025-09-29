# TODO: Fix Verify OTP Session Flow

## Steps to Complete

- [x] 1. Update Prisma schema (prisma/schema.prisma): Add optional `browserFingerprint String?` and `userAgent String?` fields to the OTP model to store device/session info for validation.
- [x] 2. Update send-session-OTP API (app/api/send-session-otp/route.js): Accept and store browserFingerprint/userAgent in OTP record; invalidate existing non-expired session OTPs before creating new one.
- [x] 3. Update verify-session-OTP API (app/api/verify-session-otp/route.js): Filter OTP query by `password: 'session-verification'`; validate stored browserFingerprint/userAgent if provided; remove misuse of `emailVerified` update; improve error handling.
- [x] 4. Update verify-OTP page (app/verify-otp/page.js): Generate and store browserFingerprint on load; auto-send OTP via API on authenticated mount; include fingerprint/userAgent in send/verify requests; add UX improvements (e.g., sent message, auto-focus).
- [ ] 5. Run Prisma commands: `npx prisma db push` to apply schema changes, then `npx prisma generate` to update client.
- [ ] 6. Test the flow: Authenticate, navigate to /verify-otp, confirm auto-send/email, verify valid OTP redirects, test resend/invalid/expired cases.

After all steps, the OTP should send automatically on page load, validate correctly with device matching, and resend without duplicates.
