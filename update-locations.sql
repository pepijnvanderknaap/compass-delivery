-- Update locations to match actual client sites
-- First, delete the demo location
DELETE FROM locations WHERE name = 'Demo Office - Amsterdam';

-- Insert the actual locations
INSERT INTO locations (name, contact_email, contact_person, is_active) VALUES
  ('SnapChat 119', 'manager.sc119@example.com', 'Location Manager', true),
  ('SnapChat 165', 'manager.sc165@example.com', 'Location Manager', true),
  ('Symphonys', 'manager.symphonys@example.com', 'Location Manager', true),
  ('Atlasian', 'manager.atlasian@example.com', 'Location Manager', true),
  ('Snowflake', 'manager.snowflake@example.com', 'Location Manager', true),
  ('JAA Training', 'manager.jaa@example.com', 'Location Manager', true)
RETURNING id, name;

-- Update your user profile to be assigned to SnapChat 119 (for demo purposes)
UPDATE user_profiles
SET location_id = (SELECT id FROM locations WHERE name = 'SnapChat 119' LIMIT 1)
WHERE id = '96295931-a80e-47e9-98e6-addf1cbe2ba4';

-- Verify the changes
SELECT 'Updated user profile:' as info;
SELECT up.full_name, up.role, l.name as location
FROM user_profiles up
LEFT JOIN locations l ON l.id = up.location_id
WHERE up.id = '96295931-a80e-47e9-98e6-addf1cbe2ba4';

SELECT 'All locations:' as info;
SELECT id, name, is_active FROM locations ORDER BY name;
