-- Add push_token column to profiles table for push notifications
-- Run this script in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.push_token IS 'Expo push notification token for mobile devices';
