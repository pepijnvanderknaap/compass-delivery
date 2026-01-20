-- Check if dishes have portion sizes set
SELECT
  id,
  name,
  category,
  default_portion_size_ml,
  default_portion_size_g
FROM dishes
WHERE id IN (
  '4a0ca1d5-bb32-49fd-be56-8d7a83ba9262', -- Mulligatawny
  'a49fdf50-f04b-46b0-9d9b-369446f699ff', -- Chicken Biryani
  'c74cdcc6-00b8-498f-8c55-0b93771b6ba1'  -- Mixed Veg Biryani
)
ORDER BY name;
