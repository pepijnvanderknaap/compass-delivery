-- Update all existing soups from 250ml to 150ml
-- This sets the new default portion size for all soup dishes

UPDATE dishes
SET
  portion_size = 150,
  default_portion_size_ml = 150
WHERE
  category = 'soup'
  AND portion_unit = 'milliliters';

-- Verify the update
SELECT
  id,
  name,
  category,
  portion_size,
  portion_unit,
  default_portion_size_ml
FROM dishes
WHERE category = 'soup'
ORDER BY name;
