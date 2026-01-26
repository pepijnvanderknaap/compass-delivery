-- Check all week_start_date values in orders
SELECT
  l.name as location_name,
  o.week_start_date,
  o.id,
  o.created_at
FROM orders o
JOIN locations l ON l.id = o.location_id
ORDER BY o.week_start_date, l.name;
