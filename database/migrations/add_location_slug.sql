-- Add slug column to locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- Update existing locations with slugs
UPDATE locations SET slug = 'snowflake' WHERE name ILIKE '%snowflake%';
UPDATE locations SET slug = 'atlassian' WHERE name ILIKE '%atlassian%';
UPDATE locations SET slug = 'snapchat-119' WHERE name ILIKE '%snapchat%' AND name ILIKE '%119%';
UPDATE locations SET slug = 'snapchat-165' WHERE name ILIKE '%snapchat%' AND name ILIKE '%165%';
UPDATE locations SET slug = 'jaa' WHERE name ILIKE '%jaa%';
UPDATE locations SET slug = 'symphony' WHERE name ILIKE '%symphony%';

-- Create index on slug for performance
CREATE INDEX IF NOT EXISTS idx_locations_slug ON locations(slug);
