# ARModelShare - Setup Guide

AR-enabled 3D model sharing platform built with React, TypeScript, Supabase, and model-viewer.

## Prerequisites

- Node.js 18+ and npm
- Supabase account ([create one here](https://app.supabase.com/))

## Supabase Setup

For detailed setup instructions, see **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**

### Quick Start

1. Create a Supabase project at [app.supabase.com](https://app.supabase.com/)
2. Create two public storage buckets: `models` and `logos`
3. Run the complete SQL schema from `supabase-schema.sql` in the SQL Editor
4. Enable Email/Password authentication
5. Copy your Project URL and anon key from Project Settings > API
6. Update `client/.env.local` with your Supabase credentials

**Note**: The `supabase-schema.sql` file contains all database tables, RLS policies, and storage policies in one place.

## Installation

### 1. Clone and Install Dependencies

```bash
# Install all dependencies
npm install
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file to client directory
cp client/.env.example client/.env.local

# Edit .env.local and add your Supabase credentials
nano client/.env.local  # or use your preferred editor
```

Update the following variables in `client/.env.local`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Important**: The `.env.local` file must be in the `client/` directory (not project root) because Vite's root is configured to the client folder.

## Running the Application

### Development Mode

```bash
npm run dev
```

This will start:
- Vite dev server with HMR (Hot Module Replacement)
- Express backend server
- Default URL: `http://localhost:5000`

### Build for Production

```bash
npm run build
```

This creates optimized production builds:
- Client: `dist/public/`
- Server: `dist/index.js`

### Run Production Build

```bash
npm start
```

Starts the production server on port 5000 (or `PORT` env variable).

### Type Checking

```bash
npm run check
```

Runs TypeScript compiler in check mode without emitting files.

## Database and Storage Setup

This project uses Supabase as a Backend-as-a-Service (BaaS):

- **PostgreSQL Database**: Relational database with Row Level Security
- **Storage**: File storage for 3D models and logos
- **Auth**: User authentication with email/password and OAuth

### Database Tables

The `supabase-schema.sql` file creates all necessary database tables:
- `models` - Uploaded 3D models with validation status
- `shared_links` - Shareable links with QR codes, views, and scans
- `activity` - Analytics and activity logs for charts
- `monthly_stats` - Monthly statistics snapshots for trend analysis
- `user_details` - Extended user profile information (display name, phone, logo)
- `user_logos` - User's logo collection for QR code embedding

### Storage Buckets

Two public storage buckets are required:
- **models** - Stores uploaded 3D model files (.glb, .gltf)
- **logos** - Stores user profile logos and QR code logos

### Security

The consolidated `supabase-schema.sql` includes:
- **Row Level Security (RLS)** policies for all tables
- **Storage policies** for both buckets
- User isolation (users can only access their own data)
- Public read access for shared models and QR codes

For complete setup instructions, see **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**

## Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components (47 shadcn/ui + custom)
│   │   ├── pages/       # Route pages
│   │   ├── services/    # Supabase service layer
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Supabase initialization
│   └── .env.local       # Environment variables (create from .env.example)
├── server/              # Express backend
├── shared/              # Shared types and schemas
├── supabase-schema.sql  # Database schema
└── SUPABASE_SETUP.md    # Detailed setup guide
```

## Troubleshooting

### Supabase Connection Issues

**Error**: "Missing Supabase environment variables"
- Verify `client/.env.local` file exists and has correct values
- Check that environment variables start with `VITE_` prefix
- Ensure `.env.local` is in `client/` directory (not project root)
- Restart the dev server after changing `.env.local`

### Authentication Not Working

- Ensure Email/Password provider is enabled in Supabase Console
- For Google Auth: Configure OAuth in Supabase and add redirect URL
- Check browser console for specific Supabase auth errors
- Verify you're using password with at least 6 characters

### File Upload Fails

- Verify both `models` and `logos` storage buckets exist and are public
- Check storage policies are configured correctly (run `supabase-schema.sql`)
- Ensure model file is `.glb` or `.gltf` format and under 100MB
- Ensure logo file is a valid image (PNG, JPG) and under 5MB
- Verify you're authenticated before uploading

### Database Query Errors

- Run `supabase-schema.sql` in SQL Editor to create tables
- Check that Row Level Security policies are enabled
- Verify you're authenticated when querying protected tables

### Port Already in Use

```bash
# Change the port in .env
echo "PORT=3000" >> .env
```

Or kill the process using port 5000:
```bash
# Linux/Mac
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

## Features

- User authentication (Email/Password + Google OAuth)
- User profile management (display name, phone, profile logo)
- 3D model upload (.glb/.gltf, max 100MB)
- Interactive 3D preview with orbit controls
- AR viewing (WebXR, AR Quick Look, Scene Viewer)
- Shareable links with customizable QR codes
- QR code customization (colors, error correction, logo embedding)
- Logo collection management for QR codes
- Analytics dashboard with charts and activity tracking
- Monthly statistics with trend analysis
- Dark mode support
- Responsive mobile-first design

## Tech Stack

**Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Wouter, TanStack Query, Google Model Viewer

**Backend**: Express.js, Supabase (Auth, PostgreSQL, Storage)

**Key Libraries**: qrcode (canvas-based QR generation), recharts (analytics charts), html2canvas, framer-motion

## License

MIT
