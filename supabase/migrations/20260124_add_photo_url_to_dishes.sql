-- Add photo_url column to dishes table
ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS photo_url TEXT;
