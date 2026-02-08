-- Add protein salad bar portion size field to location_settings (for Snowflake)
ALTER TABLE location_settings
ADD COLUMN IF NOT EXISTS protein_salad_bar_portion_g INTEGER DEFAULT 0;

-- Set default for Snowflake location (can be adjusted in the UI)
UPDATE location_settings
SET protein_salad_bar_portion_g = 80
WHERE location_id = (SELECT id FROM locations WHERE name = 'Snowflake' LIMIT 1);
