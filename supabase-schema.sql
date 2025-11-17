-- Supabase Database Schema for AR Model Sharing Application
-- Run this in the Supabase SQL Editor to set up your database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Models table
CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  model_url TEXT NOT NULL,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('ready', 'warning', 'error')),
  validation_issues JSONB DEFAULT '[]'::jsonb,
  uploaded_at BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared Links table
CREATE TABLE IF NOT EXISTS shared_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  views INTEGER DEFAULT 0,
  scans INTEGER DEFAULT 0,
  created_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity table
CREATE TABLE IF NOT EXISTS activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('upload', 'share', 'view', 'scan', 'delete')),
  description TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_models_user_id ON models(user_id);
CREATE INDEX IF NOT EXISTS idx_models_uploaded_at ON models(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_links_user_id ON shared_links(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_model_id ON shared_links(model_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_created_at ON shared_links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity(timestamp DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;

-- Models policies
CREATE POLICY "Users can view their own models"
  ON models FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view models referenced by active shared links"
  ON models FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_links
      WHERE shared_links.model_id = models.id
        AND shared_links.is_active = true
        AND shared_links.expires_at > EXTRACT(EPOCH FROM NOW()) * 1000
    )
  );

CREATE POLICY "Users can insert their own models"
  ON models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own models"
  ON models FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own models"
  ON models FOR DELETE
  USING (auth.uid() = user_id);

-- Shared links policies
CREATE POLICY "Users can view their own shared links"
  ON shared_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view active shared links"
  ON shared_links FOR SELECT
  USING (is_active = true AND expires_at > EXTRACT(EPOCH FROM NOW()) * 1000);

CREATE POLICY "Users can insert their own shared links"
  ON shared_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shared links"
  ON shared_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shared links"
  ON shared_links FOR DELETE
  USING (auth.uid() = user_id);

-- Activity policies
CREATE POLICY "Users can view their own activity"
  ON activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity"
  ON activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Helper functions for incrementing counters
CREATE OR REPLACE FUNCTION increment_views(link_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE shared_links
  SET views = views + 1
  WHERE id = link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_scans(link_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE shared_links
  SET scans = scans + 1
  WHERE id = link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- NEW: Monthly Stats Table for Trend Analysis (Added: 2025-11-11)
-- ============================================================================

-- Monthly Stats table
-- Stores monthly snapshots of user statistics for month-over-month trend analysis
CREATE TABLE IF NOT EXISTS monthly_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL, -- Month number (1-12)
  year INTEGER NOT NULL, -- Year (e.g., 2025)
  total_models INTEGER NOT NULL DEFAULT 0,
  active_links INTEGER NOT NULL DEFAULT 0,
  total_scans INTEGER NOT NULL DEFAULT 0,
  total_views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_monthly_stats_user_id ON monthly_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_year_month ON monthly_stats(year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_user_year_month ON monthly_stats(user_id, year DESC, month DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE monthly_stats ENABLE ROW LEVEL SECURITY;

-- Users can view their own monthly stats
CREATE POLICY "Users can view their own monthly stats"
  ON monthly_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own monthly stats
CREATE POLICY "Users can insert their own monthly stats"
  ON monthly_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own monthly stats
CREATE POLICY "Users can update their own monthly stats"
  ON monthly_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own monthly stats
CREATE POLICY "Users can delete their own monthly stats"
  ON monthly_stats FOR DELETE
  USING (auth.uid() = user_id);

-- Helper function to save or update monthly stats snapshot
-- This function automatically saves the current month's stats or updates if they already exist
CREATE OR REPLACE FUNCTION save_monthly_stats_snapshot(
  p_user_id UUID,
  p_total_models INTEGER,
  p_active_links INTEGER,
  p_total_scans INTEGER,
  p_total_views INTEGER
)
RETURNS void AS $$
DECLARE
  current_month INTEGER := EXTRACT(MONTH FROM NOW());
  current_year INTEGER := EXTRACT(YEAR FROM NOW());
BEGIN
  INSERT INTO monthly_stats (user_id, month, year, total_models, active_links, total_scans, total_views)
  VALUES (p_user_id, current_month, current_year, p_total_models, p_active_links, p_total_scans, p_total_views)
  ON CONFLICT (user_id, month, year)
  DO UPDATE SET
    total_models = EXCLUDED.total_models,
    active_links = EXCLUDED.active_links,
    total_scans = EXCLUDED.total_scans,
    total_views = EXCLUDED.total_views,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- NEW: User Details Table for Extended Profile Information (Added: 2025-11-12)
-- ============================================================================

-- User Details table
-- Stores extended user profile information including custom display name, phone, and logo
CREATE TABLE IF NOT EXISTS user_details (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  user_logo TEXT, -- URL to the user's logo/avatar in storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE user_details ENABLE ROW LEVEL SECURITY;

-- Users can view their own details
CREATE POLICY "Users can view their own details"
  ON user_details FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own details
CREATE POLICY "Users can insert their own details"
  ON user_details FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own details
CREATE POLICY "Users can update their own details"
  ON user_details FOR UPDATE
  USING (auth.uid() = id);

-- Users can delete their own details
CREATE POLICY "Users can delete their own details"
  ON user_details FOR DELETE
  USING (auth.uid() = id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before update
CREATE TRIGGER trigger_update_user_details_updated_at
  BEFORE UPDATE ON user_details
  FOR EACH ROW
  EXECUTE FUNCTION update_user_details_updated_at();

-- ============================================================================
-- NEW: User Logos Table for QR Code Logo Collection (Added: 2025-11-12)
-- ============================================================================

-- User Logos table
-- Stores user's logo collection that can be embedded in QR codes
CREATE TABLE IF NOT EXISTS user_logos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL, -- URL to the logo file in storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_logos_user_id ON user_logos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_logos_created_at ON user_logos(created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE user_logos ENABLE ROW LEVEL SECURITY;

-- Users can view their own logos
CREATE POLICY "Users can view their own logos"
  ON user_logos FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own logos
CREATE POLICY "Users can insert their own logos"
  ON user_logos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own logos
CREATE POLICY "Users can update their own logos"
  ON user_logos FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own logos
CREATE POLICY "Users can delete their own logos"
  ON user_logos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STORAGE BUCKET POLICIES
-- ============================================================================
-- These policies control access to files in storage buckets
-- Note: Storage buckets must be created manually in the Supabase Dashboard
-- before running these policies (see SUPABASE_SETUP.md for instructions)

-- Storage policies for 'models' bucket
-- Allows authenticated users to upload, update, and delete their own files
-- Allows public read access for AR viewing

-- Public can read all models
CREATE POLICY "Public read access to models"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'models');

-- Authenticated users can upload to their folder
CREATE POLICY "Authenticated users can upload models"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'models'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own files
CREATE POLICY "Users can update their own models"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'models'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own files
CREATE POLICY "Users can delete their own models"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'models'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policies for 'logos' bucket
-- Allows authenticated users to upload, update, and delete their own logos
-- Allows public read access for QR code embedding

-- Public can read all logos
CREATE POLICY "Public read access to logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

-- Authenticated users can upload logos to their folder
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own logos
CREATE POLICY "Users can update their own logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own logos
CREATE POLICY "Users can delete their own logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- NEW: Automatic Expiration Cleanup (Added: 2025-11-12)
-- ============================================================================
-- This section implements automatic deactivation of expired shared links
-- using PostgreSQL's pg_cron extension for scheduled tasks.
--
-- Purpose: Automatically set is_active = false for links that have passed
-- their expiration date, ensuring expired links are properly deactivated
-- without manual intervention.
--
-- Schedule: Runs daily at 2:00 AM (configurable)

-- Function to deactivate expired shared links
-- Returns the number of links that were deactivated
CREATE OR REPLACE FUNCTION deactivate_expired_links()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Update all active links that have passed their expiration date
  UPDATE shared_links
  SET is_active = false
  WHERE is_active = true
    AND expires_at < EXTRACT(EPOCH FROM NOW()) * 1000;

  -- Get the number of rows affected
  GET DIAGNOSTICS affected_count = ROW_COUNT;

  -- Return count for logging purposes
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_cron extension for scheduled tasks
-- Note: This extension must be enabled by a superuser or through Supabase Dashboard
-- If this fails, follow the manual setup instructions below
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup job to run daily at 2:00 AM
-- Cron format: 'minute hour day month weekday'
-- Examples:
--   '0 2 * * *'    = Daily at 2:00 AM
--   '0 */6 * * *'  = Every 6 hours
--   '0 * * * *'    = Every hour
SELECT cron.schedule(
  'deactivate-expired-links',           -- Job name
  '0 2 * * *',                          -- Schedule: Daily at 2:00 AM
  'SELECT deactivate_expired_links();'  -- SQL command to execute
);
