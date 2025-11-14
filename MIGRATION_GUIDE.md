# Architecture Migration Guide: Frontend-to-Backend API

## Overview

The application has been refactored from a **direct frontend-to-database** architecture to a proper **backend API** architecture for improved security and maintainability.

## What Changed

### ❌ Before (Insecure)
- Frontend directly accessed Supabase database
- Database credentials exposed in browser
- No server-side validation
- Business logic in frontend

### ✅ After (Secure)
- Backend Express server handles all database operations
- Frontend makes HTTP requests to backend API
- Server-side validation and security
- Database credentials kept secure on backend

## Architecture Changes

### Backend (New)

**New Files:**
- `server/db.ts` - Server-side Supabase client with service role key
- `server/middleware/auth.ts` - Authentication middleware
- `server/routes/auth.routes.ts` - Authentication endpoints
- `server/routes/model.routes.ts` - Model CRUD endpoints
- `server/routes/share.routes.ts` - Share link endpoints
- `server/routes/logo.routes.ts` - Logo management endpoints
- `server/routes/profile.routes.ts` - User profile endpoints
- `server/routes/analytics.routes.ts` - Analytics endpoints
- `server/routes/upload.routes.ts` - File upload endpoints

**Updated Files:**
- `server/routes.ts` - Now registers all API routes

### Frontend (Updated)

**New Files:**
- `client/src/lib/api.ts` - HTTP client for backend API calls

**Updated Services (Backup copies with .old.ts extension):**
- `client/src/services/model.service.ts` - Now uses HTTP API
- `client/src/services/share.service.ts` - Now uses HTTP API
- `client/src/services/logos.service.ts` - Now uses HTTP API
- `client/src/services/profile.service.ts` - Now uses HTTP API
- `client/src/services/analytics.service.ts` - Now uses HTTP API
- `client/src/services/upload.service.ts` - Now uses HTTP API
- `client/src/services/auth.service.ts` - Still uses Supabase for auth (tokens validated by backend)

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Sign up with email/password
- `POST /api/auth/signin` - Sign in with email/password
- `GET /api/auth/me` - Get current user
- `POST /api/auth/signout` - Sign out

### Models
- `POST /api/models` - Create model record
- `GET /api/models/:id` - Get model by ID
- `GET /api/models` - Get all user models
- `GET /api/models/recent` - Get recent models (paginated)
- `PATCH /api/models/:id` - Update model
- `DELETE /api/models/:id` - Delete model
- `GET /api/models/count` - Count user models

### Share Links
- `POST /api/share` - Create share link
- `GET /api/share/:id` - Get share link (public)
- `GET /api/share` - Get all user share links
- `PATCH /api/share/:id` - Update share link
- `POST /api/share/:id/revoke` - Revoke share link
- `POST /api/share/:id/extend` - Extend expiration
- `POST /api/share/:id/increment-views` - Increment view count
- `POST /api/share/:id/increment-scans` - Increment scan count
- `GET /api/share/count/active` - Count active links
- `POST /api/share/inactivate-model/:modelId` - Inactivate model links

### Logos
- `GET /api/logos` - Get all user logos
- `GET /api/logos/:id` - Get logo by ID
- `POST /api/logos` - Create logo record
- `PATCH /api/logos/:id` - Update logo
- `DELETE /api/logos/:id` - Delete logo
- `POST /api/logos/upload` - Upload logo file
- `DELETE /api/logos/storage` - Delete logo from storage

### Profile
- `GET /api/profile` - Get user details
- `PATCH /api/profile` - Update user details
- `POST /api/profile/upload-logo` - Upload user logo
- `DELETE /api/profile/logo` - Delete user logo

### Analytics
- `GET /api/analytics/stats` - Get analytics stats with trends
- `GET /api/analytics/activity` - Get recent activity
- `POST /api/analytics/log` - Log activity event
- `GET /api/analytics/chart-data` - Get chart data
- `GET /api/analytics/storage` - Get storage usage

### Upload
- `POST /api/upload/model` - Upload model file (GLB/GLTF/ZIP)
- `DELETE /api/upload/model` - Delete model files from storage

## Setup Instructions

### 1. Install Dependencies

Backend dependencies are already installed:
- `multer` - File upload handling
- `jszip` - ZIP file processing

### 2. Environment Variables

**Required for Backend:**

Add to `.env.local` (root directory):

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Server Configuration
PORT=5000
```

**How to get SUPABASE_SERVICE_KEY:**
1. Go to [Supabase Console](https://app.supabase.com/)
2. Select your project
3. Go to Project Settings > API
4. Copy the `service_role` key (NOT the anon key!)
5. ⚠️ **KEEP THIS SECRET** - Never commit to git or expose to frontend

**Optional for Frontend:**

Add to `client/.env.local` (if API is on different port/domain):

```env
VITE_API_URL=http://localhost:5000
```

Leave empty if frontend and backend are on same origin (default).

### 3. Update .gitignore

Ensure `.env.local` is in `.gitignore`:

```
.env.local
.env.*.local
```

### 4. Database Setup

Make sure your Supabase database has the following tables:
- `models` - 3D model records
- `shared_links` - Share links with QR codes
- `user_logos` - Logo collection
- `user_details` - Extended user profile
- `activity` - Activity events
- `monthly_stats` - Monthly statistics snapshots

### 5. Test the Migration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Test authentication:
   - Sign up a new user
   - Sign in
   - Verify token is sent in requests

3. Test file uploads:
   - Upload a 3D model
   - Verify it appears in your models list

4. Test share links:
   - Create a share link
   - Test QR code generation
   - Verify view/scan counters increment

## Authentication Flow

1. User signs in via frontend (Supabase Auth)
2. Frontend receives JWT token
3. Frontend stores token in Supabase session
4. All API requests include token in `Authorization: Bearer <token>` header
5. Backend validates token with Supabase
6. Backend attaches user info to request
7. Backend performs authorized operations

## Security Improvements

✅ **Database credentials secured** - Service key never exposed to client
✅ **Server-side validation** - All inputs validated before database operations
✅ **Authentication required** - All endpoints protected except public AR viewing
✅ **Ownership verification** - Users can only access their own resources
✅ **Token-based auth** - JWT tokens validated on every request
✅ **File upload security** - File size and type validation

## Rollback (If Needed)

If you need to rollback to the old architecture:

1. Rename service files:
   ```bash
   cd client/src/services
   for f in *.old.ts; do mv "$f" "${f%.old.ts}.ts"; done
   ```

2. Remove new files:
   ```bash
   rm client/src/lib/api.ts
   rm -rf server/routes/
   rm server/db.ts
   rm server/middleware/
   ```

3. Restore original `server/routes.ts`:
   ```typescript
   export async function registerRoutes(app: Express): Promise<Server> {
     const httpServer = createServer(app);
     return httpServer;
   }
   ```

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Check `.env.local` has `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Restart development server after adding env vars

### Error: "Unauthorized: No token provided"
- User not signed in
- Check Supabase auth session is active
- Verify token is in Authorization header

### Error: "Forbidden"
- User trying to access another user's resources
- Check ownership verification in backend routes

### File uploads not working
- Check `multer` is installed: `npm list multer`
- Verify file size under 100MB
- Check file extension (.glb, .gltf, .zip only)

### CORS errors
- Ensure frontend and backend on same origin, OR
- Add CORS middleware to Express if needed

## Next Steps

1. ✅ Set up environment variables
2. ✅ Test all features in development
3. 🔄 Update deployment configuration for production
4. 🔄 Set up proper error logging and monitoring
5. 🔄 Add rate limiting to API endpoints
6. 🔄 Consider adding request caching for performance

## Questions?

Review the code comments in:
- `server/db.ts` - Database setup
- `server/middleware/auth.ts` - Authentication logic
- `client/src/lib/api.ts` - HTTP client implementation
