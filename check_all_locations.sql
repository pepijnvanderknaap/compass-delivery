-- Check all locations and their settings
SELECT
  id,
  name,
  address,
  city,
  state,
  postal_code,
  country,
  created_at
FROM locations
ORDER BY name;

-- Check which locations have orders
SELECT
  l.name as location_name,
  COUNT(DISTINCT o.id) as order_count,
  COUNT(DISTINCT o.week_start_date) as week_count,
  MIN(o.week_start_date) as earliest_week,
  MAX(o.week_start_date) as latest_week
FROM locations l
LEFT JOIN orders o ON o.location_id = l.id
GROUP BY l.id, l.name
ORDER BY l.name;

-- Check which locations have user profiles assigned
SELECT
  l.name as location_name,
  COUNT(up.id) as user_count,
  STRING_AGG(up.full_name, ', ') as users
FROM locations l
LEFT JOIN user_profiles up ON up.location_id = l.id
GROUP BY l.id, l.name
ORDER BY l.name;

-- Check if there are any inconsistencies in location naming
SELECT
  name,
  COUNT(*) as duplicate_count
FROM locations
GROUP BY name
HAVING COUNT(*) > 1;
