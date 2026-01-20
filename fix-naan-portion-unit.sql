-- Fix Naan Bread to use pieces as the portion unit
UPDATE dishes
SET portion_unit = 'pieces',
    portion_size = 1,
    default_portion_size_g = NULL  -- Remove grams so it doesn't convert to kg
WHERE name LIKE '%Naan%' OR name LIKE '%naan%';

-- Verify the change
SELECT id, name, portion_unit, portion_size, default_portion_size_g, default_portion_size_ml
FROM dishes
WHERE name LIKE '%Naan%' OR name LIKE '%naan%';
