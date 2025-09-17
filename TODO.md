# TODO: Update Register Page and Database Schema

## Completed Tasks
- [x] Update Prisma schema: Add firstName, middleName (optional), lastName, birthdate, contactNumber to User model
- [x] Update API register: Accept new fields, validate, compute full name, save to OTP table temporarily
- [x] Update register page: Replace username with firstName, middleName (optional), lastName, birthdate (date input), contactNumber (11 digits), adjust UI size
- [x] Implement OTP verification flow: Save user data in OTP table, send OTP email, verify OTP before creating user in main User table
- [x] Run Prisma migrations for user fields and OTP data

## Next Steps
- [ ] Test the updated register form and API including OTP flow
- [ ] Update login page if needed to handle new fields
- [ ] Update profile page to display/edit new fields
