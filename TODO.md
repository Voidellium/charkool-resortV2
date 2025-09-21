# Implementation Plan: Email Domain Restriction & Account Linking

## Current Status: In Progress

### ✅ Completed Steps:
- [x] Database Changes - Add googleId field to User model
- [x] Generate and apply Prisma migration
- [x] Email Domain Restriction - Backend validation
- [x] Email Domain Restriction - Frontend validation
- [ ] Account Linking Enhancement - NextAuth callbacks
- [ ] Testing - Domain validation
- [ ] Testing - Account linking scenarios

### 📋 Next Steps:
1. **Database Changes**
   - Add `googleId` field to User model in Prisma schema
   - Generate and apply database migration

2. **Email Domain Restriction**
   - Create utility function for domain validation
   - Add domain validation to registration API
   - Update frontend to show domain validation errors

3. **Account Linking Enhancement**
   - Enhance NextAuth signIn callback for better account linking
   - Ensure proper handling of existing local accounts with Google OAuth

4. **Testing & Validation**
   - Test registration with allowed domains
   - Test registration with blocked domains
   - Test Google OAuth account linking scenarios

### 🎯 Current Task:
Implementing account linking enhancement - NextAuth callbacks
