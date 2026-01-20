-- Diagnostic queries to understand location duplicates

-- 1. Show all locations with their IDs and creation dates
SELECT id, name, address, is_active, created_at
FROM locations
ORDER BY name, created_at;

-- 2. Identify duplicate location names
SELECT name, COUNT(*) as count
FROM locations
GROUP BY name
HAVING COUNT(*) > 1;

-- 3. Check if any orders reference the duplicate location IDs
SELECT
  l.name as location_name,
  l.id as location_id,
  l.created_at as location_created,
  COUNT(o.id) as order_count
FROM locations l
LEFT JOIN orders o ON o.location_id = l.id
GROUP BY l.name, l.id, l.created_at
ORDER BY l.name, l.created_at;

-- 4. Check if any user profiles reference the duplicate location IDs
SELECT
  l.name as location_name,
  l.id as location_id,
  COUNT(up.id) as user_count
FROM locations l
LEFT JOIN user_profiles up ON up.location_id = l.id
GROUP BY l.name, l.id
ORDER BY l.name;
