-- Rename "Dark Kitchen" to "Kitchen" for consistency
-- This aligns the database name with the route structure (/kitchen/*)

UPDATE locations
SET name = 'Kitchen'
WHERE name = 'Dark Kitchen';

-- Verify the change
SELECT id, name, created_at
FROM locations
WHERE name = 'Kitchen';
