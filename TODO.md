# OTP Authentication Fix

## Plan Implementation Steps:

### 1. Add Credentials Provider to auth.js ✅
- [ ] Import CredentialsProvider from NextAuth
- [ ] Configure credentials authentication with email/password
- [ ] Add proper JWT callbacks to include user role in token
- [ ] Integrate with existing OTP verification system

### 2. Create OTP Verification for Role-Based Access
- [ ] Add OTP verification step for new browsers/sessions
- [ ] Create API endpoint for session-based OTP verification
- [ ] Update login flow to handle OTP verification

### 3. Update Login Flow
- [ ] Modify login form to handle OTP verification step
- [ ] Add session management for OTP verification
- [ ] Fix the page refresh issue

### 4. Add Database Integration
- [ ] Connect credentials provider to Prisma User model
- [ ] Add proper password hashing/verification
- [ ] Ensure role-based access control works properly

## Testing Checklist:
- [ ] Test login with existing credentials
- [ ] Test OTP verification for new browsers
- [ ] Verify role-based redirects work properly
- [ ] Test with different user roles (customer, admin, etc.)
