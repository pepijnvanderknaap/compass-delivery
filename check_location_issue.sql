-- Check if this location exists
SELECT * FROM locations WHERE id = '20b05bf0-f8ba-4654-bebf-ee940ad5258c';

-- Check which user is assigned to this location
SELECT id, full_name, email, location_id
FROM user_profiles
WHERE location_id = '20b05bf0-f8ba-4654-bebf-ee940ad5258c';

-- See all available locations
SELECT id, name FROM locations ORDER BY name;
