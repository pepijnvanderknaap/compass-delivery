-- Cleanup old week records
-- This will delete all orders that are NOT for the current 4 weeks
-- (current week + 3 weeks ahead)

-- First, let's see what we have
SELECT
  l.name as location_name,
  o.week_start_date,
  CASE
    WHEN o.week_start_date >= '2026-01-20' AND o.week_start_date <= '2026-02-10' THEN 'KEEP'
    ELSE 'DELETE'
  END as action
FROM orders o
JOIN locations l ON l.id = o.location_id
ORDER BY l.name, o.week_start_date;

-- To execute the cleanup, uncomment the line below:
-- DELETE FROM orders WHERE week_start_date < '2026-01-20' OR week_start_date > '2026-02-10';
