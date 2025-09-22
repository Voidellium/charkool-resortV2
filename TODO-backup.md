# Fix OTP Verification for New Browsers/Incognito Mode

## Plan Implementation Steps:

### 1. Update Middleware (`middleware.ts`)
- [ ] Remove role-based restrictions for OTP verification
- [ ] Apply browser trust checks to ALL authenticated users (including guests)
- [ ] Only require OTP for new browsers or incognito mode

### 2. Update Browser Trust Logic (`app/api/check-trusted-browser/route.js`)
- [ ] Modify to handle all user types consistently
- [ ] Add incognito mode detection to the trust check

### 3. Update Browser Fingerprint Provider (`components/BrowserFingerprintProvider.js`)
- [ ] Remove role-based browser registration logic
- [ ] Register trusted browsers for all authenticated users

### 4. Update Session OTP APIs
- [ ] Ensure they work consistently for all user types
- [ ] Add incognito mode consideration

### 5. Testing
- [ ] Test with different user roles
- [ ] Test with new browsers and incognito mode
- [ ] Verify existing trusted browsers still work
- [ ] Check OTP flow works correctly for all scenarios
