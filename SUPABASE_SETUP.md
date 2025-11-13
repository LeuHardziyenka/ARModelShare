# Supabase Setup Guide

This guide will help you set up Supabase for the AR Model Sharing application.

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com/](https://app.supabase.com/)
2. Sign in or create an account
3. Click **"New Project"**
4. Fill in the details:
   - **Name**: ARModelShare (or your preferred name)
   - **Database Password**: Choose a strong password (save it securely!)
   - **Region**: Select the region closest to your users
5. Click **"Create new project"**
6. Wait for the project to be provisioned (1-2 minutes)

## Step 2: Create Storage Buckets

Storage buckets must be created manually before running the database schema.

### Create 'models' Bucket

1. Go to **Storage** in the left sidebar
2. Click **"Create a new bucket"**
3. Enter the following details:
   - **Name**: `models`
   - **Public bucket**: ✅ **Check this box** (IMPORTANT!)
4. Click **"Create bucket"**

### Create 'logos' Bucket

1. Click **"Create a new bucket"** again
2. Enter the following details:
   - **Name**: `logos`
   - **Public bucket**: ✅ **Check this box** (IMPORTANT!)
3. Click **"Create bucket"**

Both buckets must be public to allow viewing of shared AR models and QR codes with embedded logos.

## Step 3: Run Database Schema and Policies

Now we'll set up all database tables and storage policies using a single SQL script.

1. Go to **SQL Editor** in the left sidebar
2. Click **"New Query"**
3. Open the `supabase-schema.sql` file from this repository
4. Copy its entire contents
5. Paste into the SQL editor
6. Click **"Run"** to execute the script

This script will create:
- All database tables (models, shared_links, activity, monthly_stats, user_details, user_logos)
- Row Level Security (RLS) policies for all tables
- Storage bucket policies for 'models' and 'logos' buckets
- Helper functions for counters and stats

You should see success messages indicating all tables and policies were created.

## Step 4: Enable Authentication Providers

### Email/Password Authentication

1. Go to **Authentication** → **Providers** (left sidebar)
2. **Email** should be enabled by default
3. Configure settings as needed:
   - Enable **Confirm email** (recommended for production)
   - Customize **Email templates** if desired

### Google OAuth (Optional)

1. Go to **Authentication** → **Providers**
2. Find **Google** in the list
3. Toggle **Enabled**
4. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
5. Click **Save**

To get Google OAuth credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

## Step 5: Get Your API Keys

1. Go to **Project Settings** → **API** (gear icon in sidebar)
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (under Project API keys)

## Step 6: Update Your .env File

1. Open `client/.env.local` in your project
2. Replace the placeholder values:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

3. Save the file
4. Restart your development server

## Step 7: Test the Setup

1. Run your development server: `npm run dev`
2. Try to sign up with a new account
3. Try uploading a 3D model file
4. Create a share link and generate a QR code
5. Check the Supabase dashboard:
   - **Authentication** → **Users** (should see your new user)
   - **Table Editor** → **models** (should see your uploaded model record)
   - **Storage** → **models** (should see your uploaded file)
   - **Table Editor** → **shared_links** (should see your share link)

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Make sure `.env.local` is in the `client/` directory (not project root)
- Check that variable names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart your dev server after changing .env files

### Upload fails with 403 or permission error
- Verify both `models` and `logos` buckets exist and are marked as **Public**
- Ensure you ran the `supabase-schema.sql` script completely (storage policies included)
- Make sure you're logged in when uploading
- Check browser console for specific error messages

### Authentication fails
- Verify email/password provider is enabled
- Check that you're using a valid email format
- Password must be at least 6 characters

### Database queries fail
- Verify you ran the `supabase-schema.sql` script successfully
- Check that RLS policies are enabled (they should be enabled by the script)
- Ensure you're authenticated when querying protected tables

### Storage policies not working
- Confirm both buckets were created **before** running the schema script
- Re-run the storage policy section of `supabase-schema.sql` if needed
- Check that bucket names are exactly `models` and `logos` (case-sensitive)

### QR code logo upload fails
- Verify the `logos` bucket exists and is public
- Check that storage policies for the logos bucket were created
- Ensure the logo file is a valid image (PNG, JPG)
- Maximum file size is typically 5MB

## Security Notes

- **Never commit `.env.local`** to version control (it's in .gitignore)
- The **anon key is safe to expose** in client-side code (it's public)
- **Service role key** should NEVER be used in client code (server-side only)
- Row Level Security (RLS) policies protect your data even with public anon key
- Storage policies ensure users can only modify their own files
- All sensitive operations are protected by authentication checks

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
