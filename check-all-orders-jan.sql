-- Check all orders for January 2025
SELECT
  o.id as order_id,
  o.week_start_date,
  l.name as location_name,
  oi.delivery_date,
  COUNT(oi.id) as item_count
FROM orders o
JOIN locations l ON l.id = o.location_id
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.week_start_date >= '2025-01-01' AND o.week_start_date <= '2025-01-31'
GROUP BY o.id, o.week_start_date, l.name, oi.delivery_date
ORDER BY oi.delivery_date, l.name;

-- Check if there are any orders with week_start_date around Jan 26-27
SELECT
  o.id,
  o.week_start_date,
  l.name,
  o.created_at
FROM orders o
JOIN locations l ON l.id = o.location_id
WHERE o.week_start_date BETWEEN '2025-01-20' AND '2025-01-31'
ORDER BY o.week_start_date, l.name;
