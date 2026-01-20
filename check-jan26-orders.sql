-- Check orders for week of Jan 26, 2025
-- Week start would be Monday, Jan 27, 2025

-- 1. Check what orders exist for delivery on Jan 26
SELECT
  l.name as location_name,
  o.week_start_date,
  o.delivery_date,
  COUNT(oi.id) as order_item_count
FROM orders o
JOIN locations l ON l.id = o.location_id
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.delivery_date >= '2025-01-20' AND o.delivery_date <= '2025-01-31'
GROUP BY l.name, o.week_start_date, o.delivery_date
ORDER BY o.delivery_date, l.name;

-- 2. Check order items for Jan 26 specifically
SELECT
  l.name as location_name,
  d.name as dish_name,
  d.category,
  oi.portions,
  oi.delivery_date
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN locations l ON l.id = o.location_id
JOIN dishes d ON d.id = oi.dish_id
WHERE oi.delivery_date = '2025-01-26'
ORDER BY l.name, d.category, d.name;

-- 3. Check all distinct delivery dates
SELECT DISTINCT delivery_date
FROM order_items
WHERE delivery_date >= '2025-01-20' AND delivery_date <= '2025-01-31'
ORDER BY delivery_date;
