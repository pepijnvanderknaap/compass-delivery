-- =====================================================
-- RESTRUCTURE SALAD COMBINATIONS SYSTEM
-- =====================================================
-- Changes:
-- 1. Simplify categories to: leafy, vegetable, coleslaw
-- 2. Add custom name field (remove auto-numbering)
-- 3. Add allergen tracking to salad combinations

-- Step 1: Add new columns to salad_combinations
ALTER TABLE salad_combinations
ADD COLUMN IF NOT EXISTS custom_name TEXT,
ADD COLUMN IF NOT EXISTS allergen_gluten BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allergen_soy BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allergen_lactose BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allergen_sesame BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allergen_sulphites BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allergen_egg BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allergen_mustard BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allergen_celery BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allergen_fish BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allergen_shellfish BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allergen_nuts BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allergen_peanuts BOOLEAN DEFAULT FALSE;

-- Step 2: Update category constraint to new values
ALTER TABLE salad_combinations
DROP CONSTRAINT IF EXISTS salad_combinations_category_check;

ALTER TABLE salad_combinations
ADD CONSTRAINT salad_combinations_category_check
CHECK (category IN ('leafy', 'vegetable', 'coleslaw'));

-- Step 3: Migrate existing data
-- Map old categories to new ones (best effort)
UPDATE salad_combinations SET category = 'leafy' WHERE category IN ('fresh', 'mediterranean');
UPDATE salad_combinations SET category = 'vegetable' WHERE category IN ('warm', 'stew', 'asian');
UPDATE salad_combinations SET category = 'coleslaw' WHERE category = 'other';

-- Step 4: Set custom names for existing salads (temporary placeholder)
-- You'll want to rename these to actual salad names later
UPDATE salad_combinations
SET custom_name = 'Salad Mix ' || display_number
WHERE custom_name IS NULL;

-- Step 5: Make custom_name required
ALTER TABLE salad_combinations
ALTER COLUMN custom_name SET NOT NULL;

-- Step 6: Drop the old unique constraint on (category, display_number)
ALTER TABLE salad_combinations
DROP CONSTRAINT IF EXISTS salad_combinations_category_display_number_key;

-- Step 7: Add new unique constraint on custom_name
ALTER TABLE salad_combinations
ADD CONSTRAINT salad_combinations_custom_name_unique UNIQUE (custom_name);

-- Step 8: display_number is now optional (we keep it for historical data but don't use it)
-- We don't drop it to preserve existing data

-- Step 9: Update the name generation function (now just returns custom_name)
CREATE OR REPLACE FUNCTION get_salad_combination_name(p_custom_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN p_custom_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 10: Update the view to use custom names
DROP VIEW IF EXISTS v_salad_combinations_full;

CREATE OR REPLACE VIEW v_salad_combinations_full AS
SELECT
  sc.id,
  sc.category,
  sc.custom_name as name,
  sc.description,
  sc.allergen_gluten,
  sc.allergen_soy,
  sc.allergen_lactose,
  sc.allergen_sesame,
  sc.allergen_sulphites,
  sc.allergen_egg,
  sc.allergen_mustard,
  sc.allergen_celery,
  sc.allergen_fish,
  sc.allergen_shellfish,
  sc.allergen_nuts,
  sc.allergen_peanuts,
  sc.created_at,
  json_agg(
    json_build_object(
      'component_id', sci.component_dish_id,
      'component_name', d.name,
      'percentage', sci.percentage
    ) ORDER BY sci.percentage DESC
  ) as components,
  COUNT(sci.id) as component_count
FROM salad_combinations sc
LEFT JOIN salad_combination_items sci ON sci.salad_combination_id = sc.id
LEFT JOIN dishes d ON d.id = sci.component_dish_id
GROUP BY sc.id, sc.category, sc.custom_name, sc.description,
         sc.allergen_gluten, sc.allergen_soy, sc.allergen_lactose,
         sc.allergen_sesame, sc.allergen_sulphites, sc.allergen_egg,
         sc.allergen_mustard, sc.allergen_celery, sc.allergen_fish,
         sc.allergen_shellfish, sc.allergen_nuts, sc.allergen_peanuts,
         sc.created_at
ORDER BY sc.category, sc.custom_name;

-- Step 11: Update dish usage view
DROP VIEW IF EXISTS v_dish_salad_usage;

CREATE OR REPLACE VIEW v_dish_salad_usage AS
SELECT
  d.id as dish_id,
  d.name as dish_name,
  sc.id as salad_combo_id,
  sc.custom_name as salad_name,
  sc.category as salad_category,
  dsc.total_portion_g,
  json_agg(
    json_build_object(
      'component_name', comp.name,
      'percentage', sci.percentage
    ) ORDER BY sci.percentage DESC
  ) as salad_components
FROM dishes d
JOIN dish_salad_combinations dsc ON dsc.main_dish_id = d.id
JOIN salad_combinations sc ON sc.id = dsc.salad_combination_id
JOIN salad_combination_items sci ON sci.salad_combination_id = sc.id
JOIN dishes comp ON comp.id = sci.component_dish_id
GROUP BY d.id, d.name, sc.id, sc.custom_name, sc.category, dsc.total_portion_g;

-- =====================================================
-- USAGE NOTES
-- =====================================================

-- To create a new salad combination:
/*
INSERT INTO salad_combinations (
  category,
  custom_name,
  description,
  allergen_lactose,  -- Example: if contains feta
  allergen_nuts      -- Example: if contains walnuts
) VALUES (
  'leafy',
  'Greek Salad',
  'Classic Greek salad with feta and olives',
  true,   -- has lactose (feta)
  false   -- no nuts
) RETURNING id;

-- Then add components...
INSERT INTO salad_combination_items (salad_combination_id, component_dish_id, percentage)
VALUES
  (<combo_id>, <lettuce_id>, 40),
  (<combo_id>, <feta_id>, 30),
  (<combo_id>, <cucumber_id>, 30);
*/

-- To view all salads by category:
-- SELECT * FROM v_salad_combinations_full WHERE category = 'leafy';

-- To rename existing salads:
/*
UPDATE salad_combinations SET custom_name = 'Indian Coleslaw' WHERE id = '<id>';
UPDATE salad_combinations SET custom_name = 'Greek Salad' WHERE id = '<id>';
UPDATE salad_combinations SET custom_name = 'Warm Vegetable Salad' WHERE id = '<id>';
*/
