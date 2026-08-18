# Integration Checklist - Multer File Upload System

## Backend Setup

- [ ] Install backend dependencies: `cd server && npm install`
- [ ] Copy `.env.example` to `.env`: `cp server/.env.example server/.env`
- [ ] Update `server/.env` with Supabase credentials
- [ ] Update `server/.env` with `CORS_ORIGIN` (add your frontend URL)
- [ ] Test backend startup: `cd server && npm run dev`
- [ ] Verify health endpoint: `curl http://localhost:5000/health`
- [ ] Create uploads directories: `mkdir -p uploads/{garage,market,avatars,pois,photos-of-week}`

## Frontend Setup

- [ ] Add `VITE_API_URL` to `.env.local` (if not localhost:5000)
- [ ] Import `uploadClient.ts` in your views
- [ ] Update file input handlers to use `uploadGarageImages()`, etc.
- [ ] Replace base64 storage with relative paths
- [ ] Update image display logic to use `/static/uploads/...` URLs

## GarageView Integration

```typescript
// OLD: Base64
const bike: GarageBike = {
  id: Date.now().toString(),
  owner: currentUser.username,
  model: 'Honda CB500',
  mods: 'Custom exhaust',
  images: [base64String1, base64String2]  // ❌ Remove
};

// NEW: File paths
const bike: GarageBike = {
  id: Date.now().toString(),
  owner: currentUser.username,
  model: 'Honda CB500',
  mods: 'Custom exhaust',
  images: ['uploads/garage/1723569012345-abc123de.jpg']  // ✅ Relative paths
};
```

- [ ] Update `GarageView.tsx` file input handler
- [ ] Replace `onAddBike` to use `uploadGarageImages()`
- [ ] Store returned `relativePath` in database
- [ ] Update image display: `<img src={`${API_URL}/static/${image}`} />`
- [ ] Test bike image upload
- [ ] Test bike image deletion
- [ ] Verify images persist in database

## MarketView Integration

- [ ] Update `MarketView.tsx` file input handler
- [ ] Replace `onAddMarketItem` to use `uploadMarketImages()`
- [ ] Store returned `relativePaths` array in database
- [ ] Update image gallery display
- [ ] Test marketplace image upload
- [ ] Test image deletion on item deletion
- [ ] Verify images in `/uploads/market/` directory

## ProfileView Integration (Avatar)

- [ ] Update avatar upload in `ProfileView.tsx`
- [ ] Use `uploadAvatar()` instead of file-to-base64
- [ ] Update user profile with `response.file.publicUrl`
- [ ] Test avatar upload
- [ ] Verify avatar URL stored in `users` table
- [ ] Check `/uploads/avatars/` directory

## MapView Integration (POI Images)

- [ ] Update POI image upload in `MapView.tsx`
- [ ] Use `uploadPoiImage()` for custom POI submissions
- [ ] Store `relativePath` in POI database record
- [ ] Update POI marker image display
- [ ] Test POI image upload
- [ ] Verify images in `/uploads/pois/` directory

## DashboardView Integration (Photo of the Week)

- [ ] Update photo submission in `DashboardView.tsx`
- [ ] Use `uploadPhotoOfWeek()` for photo submissions
- [ ] Store `publicUrl` in `photos_of_the_week` table
- [ ] Update photo voting display
- [ ] Test photo submission
- [ ] Verify images in `/uploads/photos-of-week/` directory

## Database Migrations

- [ ] Update schema: `ALTER TABLE pixel_garage ADD COLUMN images TEXT[]`
- [ ] Update schema: `ALTER TABLE market_items ADD COLUMN images TEXT[]`
- [ ] Update schema: `ALTER TABLE users ADD COLUMN avatar_url TEXT`
- [ ] Update schema: `ALTER TABLE custom_pois ADD COLUMN image TEXT`
- [ ] Update schema: `ALTER TABLE photos_of_the_week ADD COLUMN image_url TEXT`
- [ ] Verify migrations applied successfully
- [ ] Test data retrieval with new schema

## Error Handling

- [ ] Add error messages for file validation failures
- [ ] Add error messages for upload failures
- [ ] Add loading states during upload
- [ ] Add success notifications after upload
- [ ] Handle network timeouts
- [ ] Handle file size exceeded errors
- [ ] Handle invalid file type errors

## Testing

- [ ] Test single file upload (avatar)
- [ ] Test multiple file upload (garage, market)
- [ ] Test file deletion
- [ ] Test with large files (near 10MB limit)
- [ ] Test with invalid file types (try .pdf, .txt)
- [ ] Test upload without internet connection
- [ ] Test concurrent uploads
- [ ] Test uploads on mobile devices
- [ ] Verify files persist after server restart
- [ ] Verify database consistency

## Production Deployment

- [ ] Review security settings in `server/.env`
- [ ] Set `NODE_ENV=production`
- [ ] Configure production `CORS_ORIGIN`
- [ ] Set up HTTPS in reverse proxy
- [ ] Configure disk space monitoring
- [ ] Set up file backup strategy
- [ ] Configure rate limiting on upload endpoints
- [ ] Monitor `/uploads/` directory size
- [ ] Set up log rotation for server logs
- [ ] Test upload functionality in production
- [ ] Document backup/restore procedures

## Documentation

- [ ] Update README with new upload system
- [ ] Document API endpoints
- [ ] Add troubleshooting guide
- [ ] Add environment variables documentation
- [ ] Create runbook for common issues
- [ ] Update team on new architecture

## Rollback Plan (if needed)

- [ ] Keep backup of old base64-based code
- [ ] Document rollback steps
- [ ] Test rollback procedure
- [ ] Keep backup of uploads directory
- [ ] Keep database backups before migration

---

## Completed Tasks ✅

- [ ] Mark tasks as you complete them
- [ ] Update this checklist regularly
- [ ] Share progress with team

**Last Updated**: 2024-08-18  
**Assigned To**: [Your Name]  
**Status**: In Progress
