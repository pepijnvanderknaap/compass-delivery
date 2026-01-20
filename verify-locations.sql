-- Verify final state of locations and settings
SELECT 
  l.id,
  l.name,
  l.address,
  l.is_active,
  l.created_at,
  COUNT(DISTINCT o.id) as order_count,
  COUNT(DISTINCT up.id) as user_count,
  CASE WHEN ls.id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_settings
FROM locations l
LEFT JOIN orders o ON o.location_id = l.id
LEFT JOIN user_profiles up ON up.location_id = l.id
LEFT JOIN location_settings ls ON ls.location_id = l.id
GROUP BY l.id, l.name, l.address, l.is_active, l.created_at, ls.id
ORDER BY 
  CASE WHEN l.name = 'Dark Kitchen' THEN 1 ELSE 2 END,
  l.name;
