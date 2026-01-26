-- Comprehensive location audit and cleanup script

-- 1. Check all locations
SELECT 'All Locations:' as check_type;
SELECT id, name, address, city, created_at FROM locations ORDER BY name;

-- 2. Check for Dark Kitchen orders (should not exist)
SELECT 'Dark Kitchen Orders (SHOULD BE DELETED):' as check_type;
SELECT
  o.id,
  o.week_start_date,
  COUNT(oi.id) as item_count
FROM orders o
JOIN locations l ON l.id = o.location_id
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE l.name = 'Dark Kitchen'
GROUP BY o.id, o.week_start_date
ORDER BY o.week_start_date;

-- 3. Check user assignments by location
SELECT 'User Assignments by Location:' as check_type;
SELECT
  l.name as location_name,
  up.full_name,
  up.email,
  up.role
FROM locations l
LEFT JOIN user_profiles up ON up.location_id = l.id
ORDER BY l.name, up.full_name;

-- 4. Check for duplicate location names
SELECT 'Duplicate Location Names (SHOULD BE NONE):' as check_type;
SELECT name, COUNT(*) as count
FROM locations
GROUP BY name
HAVING COUNT(*) > 1;

-- 5. Verify week consistency across all actual locations (excluding Dark Kitchen)
SELECT 'Week Count by Location (should all be 4):' as check_type;
SELECT
  l.name as location_name,
  COUNT(DISTINCT o.week_start_date) as week_count,
  STRING_AGG(DISTINCT o.week_start_date::text, ', ' ORDER BY o.week_start_date) as weeks
FROM locations l
LEFT JOIN orders o ON o.location_id = l.id
WHERE l.name != 'Dark Kitchen'
GROUP BY l.id, l.name
ORDER BY l.name;

-- CLEANUP COMMANDS (uncomment to execute):

-- Delete all Dark Kitchen orders
-- DELETE FROM order_items WHERE order_id IN (
--   SELECT o.id FROM orders o
--   JOIN locations l ON l.id = o.location_id
--   WHERE l.name = 'Dark Kitchen'
-- );
-- DELETE FROM orders WHERE location_id IN (
--   SELECT id FROM locations WHERE name = 'Dark Kitchen'
-- );
