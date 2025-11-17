-- Migration: Add 'delete' activity type to activity table
-- This migration updates the CHECK constraint to allow 'delete' as a valid activity type

-- Drop the existing constraint
ALTER TABLE activity DROP CONSTRAINT IF EXISTS activity_type_check;

-- Add the new constraint with 'delete' included
ALTER TABLE activity ADD CONSTRAINT activity_type_check
  CHECK (type IN ('upload', 'share', 'view', 'scan', 'delete'));

-- Verify the change
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'activity'::regclass AND conname = 'activity_type_check';
