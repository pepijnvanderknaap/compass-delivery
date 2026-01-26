-- Test script for automatic week creation
-- This script will delete existing orders for Atlassian to test automatic creation

-- First, check what exists
SELECT
  l.name as location_name,
  o.week_start_date,
  o.id as order_id
FROM orders o
JOIN locations l ON l.id = o.location_id
WHERE l.name IN ('Atlassian', 'Symphony')
ORDER BY l.name, o.week_start_date;

-- Uncomment the lines below to delete orders for testing
-- DELETE FROM orders WHERE location_id = '20b05bf0-f8ba-4654-bebf-ee940ad5258c'; -- Atlassian
-- DELETE FROM orders WHERE location_id = '138b9f76-ad25-484b-955d-da1c8b72ddc9'; -- Symphony
