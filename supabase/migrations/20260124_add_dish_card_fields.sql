-- Add dish card presentation fields
ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS portion_display TEXT,
ADD COLUMN IF NOT EXISTS calories_display TEXT,
ADD COLUMN IF NOT EXISTS origin_display TEXT,
ADD COLUMN IF NOT EXISTS cooking_method TEXT,
ADD COLUMN IF NOT EXISTS prep_time TEXT,
ADD COLUMN IF NOT EXISTS chef_note TEXT;
