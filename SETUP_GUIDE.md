# Pixel Rider - Multer File Upload System Setup Guide

## 🎯 Overview

This document explains the new Multer-based file upload system that replaces base64 encoding with server-side file storage.

### Key Features
- ✅ Centralized file storage on server (`/uploads`)
- ✅ Relative file paths stored in PostgreSQL database
- ✅ Support for multiple upload categories (garage, market, avatars, POIs, photos)
- ✅ File validation (MIME types, size limits)
- ✅ Error handling and recovery
- ✅ Static file serving via `/static` endpoint
- ✅ Production-ready with Docker support

---

## 📁 Directory Structure

```
project/
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── multer.ts          # Multer storage configuration
│   │   │   └── supabase.ts        # Supabase client
│   │   ├── middleware/
│   │   │   ├── auth.ts            # Authentication middleware
│   │   │   └── errorHandler.ts    # Global error handling
│   │   ├── utils/
│   │   │   └── imageOptimizer.ts  # Image compression/resizing
│   │   ├── routes/
│   │   │   └── upload.ts          # Upload API endpoints
│   │   └── index.ts               # Express server setup
│   ├── .env.example               # Environment template
│   ├── package.json
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── tsconfig.json
├── src/
│   └── lib/
│       └── uploadClient.ts        # Frontend upload utility
└── SETUP_GUIDE.md                 # This file
```

---

## 🚀 Quick Start

### Backend Setup

```bash
# 1. Install dependencies
cd server
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials and other settings

# 3. Run development server
npm run dev
# Server runs on http://localhost:5000
```

### Docker Setup (Recommended)

```bash
cd server

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

### Frontend Setup

```bash
# Set API URL in your environment (optional, defaults to localhost:5000)
export VITE_API_URL=http://localhost:5000

# Or add to .env file
echo "VITE_API_URL=http://localhost:5000" >> .env.local

# Start frontend
npm run dev
```

---

## 📝 Environment Variables

Create `server/.env` based on `.env.example`:

```bash
# Server
PORT=5000
NODE_ENV=development
API_URL=http://localhost:5000

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,image/gif

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,https://www.pixel-rider.de

# Image Optimization
ENABLE_IMAGE_COMPRESSION=true
IMAGE_QUALITY=80
IMAGE_SIZES=thumbnail:150x150,small:400x400,medium:800x800
```

---

## 🔌 API Endpoints

### Upload Endpoints

All upload endpoints require multipart/form-data requests.

#### Garage Images

```http
POST /api/upload/garage
Content-Type: multipart/form-data

Form field: images (array, max 5 files)
Response: { success: true, files: [...] }
```

#### Market Item Images

```http
POST /api/upload/market
Content-Type: multipart/form-data

Form field: images (array, max 8 files)
Response: { success: true, files: [...] }
```

#### User Avatar

```http
POST /api/upload/avatars
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form field: avatar (single file)
Response: { success: true, file: {...} }
```

#### POI Image

```http
POST /api/upload/pois
Content-Type: multipart/form-data

Form field: image (single file)
Response: { success: true, file: {...} }
```

#### Photo of the Week

```http
POST /api/upload/photos-of-week
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form field: photo (single file)
Response: { success: true, file: {...} }
```

#### Delete File

```http
DELETE /api/upload/:category/:filename
Authorization: Bearer <token>

Response: { success: true, message: "File deleted successfully" }
```

### Response Format

**Success Response (200)**
```json
{
  "success": true,
  "file": {
    "originalName": "my-bike.jpg",
    "filename": "1723569012345-abc123de.jpg",
    "relativePath": "uploads/garage/1723569012345-abc123de.jpg",
    "publicUrl": "http://localhost:5000/static/uploads/garage/1723569012345-abc123de.jpg",
    "size": 245678,
    "mimeType": "image/jpeg",
    "uploadedAt": "2024-08-18T12:30:12.345Z"
  },
  "message": "Avatar uploaded successfully"
}
```

**Error Response (4xx/5xx)**
```json
{
  "success": false,
  "error": "Invalid file type. Allowed types: image/jpeg, image/png, image/webp, image/gif"
}
```

---

## 💻 Frontend Usage

### Basic Upload

```typescript
import { uploadGarageImages } from '@/lib/uploadClient';

// Handle file input
const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = event.currentTarget.files;
  if (!files) return;

  const response = await uploadGarageImages(Array.from(files));
  
  if (response.success && response.files) {
    // Store relative paths in database
    const relativePaths = response.files.map(f => f.relativePath);
    console.log('Uploaded paths:', relativePaths);
    
    // Update bike data
    await updateBikeImages(bikeId, relativePaths);
  } else {
    console.error('Upload failed:', response.error);
  }
};
```

### Upload with Validation

```typescript
import { validateImageFile, uploadAvatar } from '@/lib/uploadClient';

const handleAvatarUpload = async (file: File) => {
  // Validate first
  const validation = validateImageFile(file);
  if (!validation.valid) {
    showAlert('Validation Error', validation.error, 'danger');
    return;
  }

  // Upload
  const response = await uploadAvatar(file);
  if (response.success && response.file) {
    // Update user profile with public URL
    updateUserProfile({ avatarUrl: response.file.publicUrl });
  }
};
```

### Display Uploaded Images

```typescript
// In database, store the relative path
const relativePath = 'uploads/garage/1723569012345-abc123de.jpg';

// In React component, convert to public URL
const publicUrl = `${API_BASE_URL}/static/${relativePath}`;

// Render
<img src={publicUrl} alt="Bike" />
```

---

## 📊 Database Schema

Update your existing tables to use relative paths instead of base64:

```sql
-- pixel_garage table
ALTER TABLE pixel_garage
ADD COLUMN images TEXT[]; -- Store as array of relative paths

-- market_items table
ALTER TABLE market_items
ADD COLUMN images TEXT[]; -- Array of relative paths

-- users table (avatar)
ALTER TABLE users
ADD COLUMN avatar_url TEXT; -- Single relative path

-- custom_pois table
ALTER TABLE custom_pois
ADD COLUMN image TEXT; -- Single relative path

-- photos_of_the_week table
ALTER TABLE photos_of_the_week
ADD COLUMN image_url TEXT; -- Relative path or full URL
```

**Example data storage:**
```json
{
  "bike_id": "123",
  "owner": "john_doe",
  "model": "Honda CB500",
  "images": [
    "uploads/garage/1723569012345-abc123de.jpg",
    "uploads/garage/1723569012356-def456gh.jpg"
  ]
}
```

---

## 🔐 Security Considerations

### File Validation
- ✅ MIME type whitelist (image/jpeg, image/png, image/webp, image/gif)
- ✅ File size limit (10MB default, configurable)
- ✅ Filename sanitization with UUID
- ✅ Path traversal prevention

### Access Control
- ✅ Optional authentication middleware on sensitive endpoints
- ✅ CORS configuration to allowed origins
- ✅ Public file serving via `/static` endpoint

### Recommendations
1. Use HTTPS in production
2. Set strong `CORS_ORIGIN` configuration
3. Implement rate limiting on upload endpoints
4. Regular backup of `/uploads` directory
5. Monitor disk space usage
6. Implement virus scanning for sensitive deployments

---

## 🐛 Troubleshooting

### "Upload Directory Not Found"

```bash
# Manually create uploads directory
mkdir -p uploads/garage uploads/market uploads/avatars uploads/pois uploads/photos-of-week
chmod 755 uploads
```

### CORS Errors

```bash
# Ensure CORS_ORIGIN in .env includes your frontend URL
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### Files Not Persisting in Docker

```yaml
# In docker-compose.yml, ensure volumes are set
volumes:
  - ./uploads:/app/uploads  # Map uploads directory
```

### Large File Uploads Fail

```bash
# Increase file size limit in .env
MAX_FILE_SIZE=52428800  # 50MB

# Also update frontend form size limits
```

---

## 📈 Performance Tips

1. **Image Optimization**: Enable `ENABLE_IMAGE_COMPRESSION=true` to auto-convert to WebP
2. **CDN**: Serve uploaded files from CDN in production (e.g., Cloudflare, AWS CloudFront)
3. **Caching**: Add cache headers via reverse proxy
4. **Database**: Index `avatar_url`, `images` columns for faster queries

---

## 🔄 Migration from Base64

If migrating from base64-encoded images:

```typescript
// 1. Export base64 images
const base64Image = currentUser.avatar_url; // data:image/jpeg;base64,...

// 2. Convert to File
const blob = await fetch(base64Image).then(r => r.blob());
const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

// 3. Upload
const response = await uploadAvatar(file);

// 4. Update database with relative path
if (response.success) {
  updateUserProfile({
    avatar_url: response.file.publicUrl  // or relativePath
  });
}
```

---

## 📞 Support

For issues or questions:
1. Check logs: `docker-compose logs backend`
2. Test health endpoint: `curl http://localhost:5000/health`
3. Review error response messages
4. Check server `.env` configuration

---

**Created**: 2024-08-18  
**Version**: 1.0.0  
**Status**: Production Ready
