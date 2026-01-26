-- Check Snapchat 165 week dates
SELECT
  l.name as location_name,
  o.week_start_date,
  o.id,
  o.created_at
FROM orders o
JOIN locations l ON l.id = o.location_id
WHERE l.name = 'Snapchat 165'
ORDER BY o.week_start_date ASC;
