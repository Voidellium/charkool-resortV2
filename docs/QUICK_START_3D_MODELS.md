# Quick Start Guide - 3D Model Management

## Post-Migration Steps

### 1. Run Database Migration
```bash
npx prisma db push
```

### 2. Seed Model Configuration (Choose one method)

**Option A: Using Node Script (Recommended)**
```bash
node scripts/seed-model-config.js
```

**Option B: Using SQL**
```bash
psql -d your_database_name < prisma/seed-models.sql
```

**Option C: Manual via Prisma Studio**
```bash
npx prisma studio
```
Then add records in ThreeDModelConfig table.

### 3. Verify Setup

1. **Test API Endpoint**
   - Open: `http://localhost:3000/api/models/paths`
   - Should return JSON with model paths

2. **Test Developer Dashboard**
   - Login as developer (no OTP!)
   - Navigate to Developer Dashboard
   - Click "3D Models" tab
   - Switch to "Room Interiors"
   - Verify all 3 rooms display

3. **Test Model Display**
   - Visit `/virtual-tour`
   - Click on a room (Teepee, Villa, or Loft)
   - Select "Interior View"
   - Verify correct model loads

## Usage Guide

### Switching Models

1. Go to Developer Dashboard → 3D Models
2. Click "Room Interiors" tab
3. Click "Edit" on any room
4. Enter new model path (e.g., `/models/Interior_Teepee_v2.glb`)
5. Click "Save"
6. Changes reflect immediately on all pages

### Model Path Rules
- Must start with `/models/`
- Must end with `.glb` or `.gltf`
- File must exist in `public/models/` directory

### Supported Models
- **Resort Map**: Main exterior map (1 active at a time)
- **Teepee Interior**: Inside view of Teepee room
- **Villa Interior**: Inside view of Villa room
- **Loft Interior**: Inside view of Loft room

## Features Completed

✅ Developer OTP bypass
✅ Interior model management UI
✅ Dynamic model path loading
✅ API endpoints for configuration
✅ Database schema for tracking
✅ Fallback to defaults if API fails
✅ All pages updated to use dynamic paths

## Troubleshooting

**Models not loading?**
- Check file exists in `public/models/`
- Verify path in database is correct
- Check browser console for errors

**Can't edit in dashboard?**
- Verify logged in as DEVELOPER role
- Check API `/api/developer/models/config` works

**Still seeing OTP prompt as developer?**
- Clear cookies and re-login
- Verify role is exactly "DEVELOPER"
