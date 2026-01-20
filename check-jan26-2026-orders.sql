-- Check orders for Monday, January 26, 2026
-- Query 1: Check all delivery dates in January 2026
SELECT DISTINCT delivery_date
FROM order_items
WHERE delivery_date >= '2026-01-01' AND delivery_date <= '2026-01-31'
ORDER BY delivery_date;

-- Query 2: Check specific orders for Jan 26, 2026
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
WHERE oi.delivery_date = '2026-01-26'
ORDER BY l.name, d.category, d.name;

-- Query 3: Check orders by location for Jan 26, 2026
SELECT
  l.name as location_name,
  COUNT(oi.id) as order_item_count,
  oi.delivery_date
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN locations l ON l.id = o.location_id
WHERE oi.delivery_date = '2026-01-26'
GROUP BY l.name, oi.delivery_date
ORDER BY l.name;

-- Query 4: Check if Symphonys, Atlasian, Snowflake have ANY orders in the week
SELECT
  l.name as location_name,
  oi.delivery_date,
  COUNT(oi.id) as order_count
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN locations l ON l.id = o.location_id
WHERE l.name IN ('Symphonys', 'Atlasian', 'Snowflake')
  AND oi.delivery_date >= '2026-01-26' AND oi.delivery_date <= '2026-01-30'
GROUP BY l.name, oi.delivery_date
ORDER BY l.name, oi.delivery_date;
