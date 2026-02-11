-- Add Kitchen Manager 2 fields to location_settings table
ALTER TABLE location_settings
ADD COLUMN IF NOT EXISTS kitchen_manager_2_name TEXT,
ADD COLUMN IF NOT EXISTS kitchen_manager_2_email TEXT,
ADD COLUMN IF NOT EXISTS kitchen_manager_2_mobile TEXT;
