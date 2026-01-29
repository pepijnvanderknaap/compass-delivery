-- =====================================================
-- RESTRUCTURE WARM VEGGIE COMBINATIONS SYSTEM
-- =====================================================
-- Changes:
-- 1. Create warm_veggie_combinations table with categories: root, green, other
-- 2. Add custom name field
-- 3. Add allergen tracking to warm veggie combinations
-- 4. Create dish_warm_veggie_combinations table (link table)
-- 5. Keep warm_veggie_combination_items for the components

-- Step 1: Create warm_veggie_combinations table
CREATE TABLE IF NOT EXISTS warm_veggie_combinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('root', 'green', 'other')),
  custom_name TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Allergen fields
  allergen_gluten BOOLEAN DEFAULT FALSE,
  allergen_soy BOOLEAN DEFAULT FALSE,
  allergen_lactose BOOLEAN DEFAULT FALSE,
  allergen_sesame BOOLEAN DEFAULT FALSE,
  allergen_sulphites BOOLEAN DEFAULT FALSE,
  allergen_egg BOOLEAN DEFAULT FALSE,
  allergen_mustard BOOLEAN DEFAULT FALSE,
  allergen_celery BOOLEAN DEFAULT FALSE,
  allergen_fish BOOLEAN DEFAULT FALSE,
  allergen_shellfish BOOLEAN DEFAULT FALSE,
  allergen_nuts BOOLEAN DEFAULT FALSE,
  allergen_peanuts BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Create warm_veggie_combination_items table (components)
CREATE TABLE IF NOT EXISTS warm_veggie_combination_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warm_veggie_combination_id UUID NOT NULL REFERENCES warm_veggie_combinations(id) ON DELETE CASCADE,
  component_dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  percentage INTEGER NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(warm_veggie_combination_id, component_dish_id)
);

-- Step 3: Create dish_warm_veggie_combinations table (link table)
CREATE TABLE IF NOT EXISTS dish_warm_veggie_combinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  main_dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  warm_veggie_combination_id UUID NOT NULL REFERENCES warm_veggie_combinations(id) ON DELETE CASCADE,
  total_portion_g INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(main_dish_id) -- Each dish can only have one warm veggie combination
);

-- Step 4: Migrate existing warm_veggie_components data to new system
-- First, let's identify unique warm veggie combinations
-- We'll create a temp table to group existing data
DO $$
DECLARE
  dish_record RECORD;
  combo_id UUID;
  existing_combo_id UUID;
  combo_name TEXT;
  combo_number INTEGER := 1;
  total_portion INTEGER;
BEGIN
  -- Loop through dishes that have warm veggie components
  FOR dish_record IN
    SELECT DISTINCT main_dish_id
    FROM warm_veggie_components
  LOOP
    -- Generate a temporary name
    combo_name := 'Warm Veggie Mix ' || combo_number;

    -- Get the component signature to check if this combo already exists
    -- Check if identical combination exists
    SELECT wvc.id INTO existing_combo_id
    FROM warm_veggie_combinations wvc
    JOIN warm_veggie_combination_items wvci ON wvci.warm_veggie_combination_id = wvc.id
    WHERE wvci.component_dish_id IN (
      SELECT component_dish_id FROM warm_veggie_components WHERE main_dish_id = dish_record.main_dish_id
    )
    GROUP BY wvc.id
    HAVING COUNT(*) = (SELECT COUNT(*) FROM warm_veggie_components WHERE main_dish_id = dish_record.main_dish_id)
    LIMIT 1;

    IF existing_combo_id IS NULL THEN
      -- Create new warm veggie combination
      INSERT INTO warm_veggie_combinations (category, custom_name, description)
      VALUES ('other', combo_name, 'Migrated from old system')
      RETURNING id INTO combo_id;

      -- Copy components to warm_veggie_combination_items
      INSERT INTO warm_veggie_combination_items (warm_veggie_combination_id, component_dish_id, percentage)
      SELECT combo_id, component_dish_id, percentage
      FROM warm_veggie_components
      WHERE main_dish_id = dish_record.main_dish_id;

      combo_number := combo_number + 1;
    ELSE
      combo_id := existing_combo_id;
    END IF;

    -- Get total portion from dish
    SELECT d.warm_veggie_total_portion_g INTO total_portion
    FROM dishes d
    WHERE d.id = dish_record.main_dish_id;

    -- Link dish to warm veggie combination
    IF total_portion IS NOT NULL AND total_portion > 0 THEN
      INSERT INTO dish_warm_veggie_combinations (main_dish_id, warm_veggie_combination_id, total_portion_g)
      VALUES (dish_record.main_dish_id, combo_id, total_portion)
      ON CONFLICT (main_dish_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Step 5: Create view for warm veggie combinations
CREATE OR REPLACE VIEW v_warm_veggie_combinations_full AS
SELECT
  wvc.id,
  wvc.category,
  wvc.custom_name as name,
  wvc.description,
  wvc.allergen_gluten,
  wvc.allergen_soy,
  wvc.allergen_lactose,
  wvc.allergen_sesame,
  wvc.allergen_sulphites,
  wvc.allergen_egg,
  wvc.allergen_mustard,
  wvc.allergen_celery,
  wvc.allergen_fish,
  wvc.allergen_shellfish,
  wvc.allergen_nuts,
  wvc.allergen_peanuts,
  wvc.created_at,
  json_agg(
    json_build_object(
      'component_id', wvci.component_dish_id,
      'component_name', d.name,
      'percentage', wvci.percentage
    ) ORDER BY wvci.percentage DESC
  ) as components,
  COUNT(wvci.id) as component_count
FROM warm_veggie_combinations wvc
LEFT JOIN warm_veggie_combination_items wvci ON wvci.warm_veggie_combination_id = wvc.id
LEFT JOIN dishes d ON d.id = wvci.component_dish_id
GROUP BY wvc.id, wvc.category, wvc.custom_name, wvc.description,
         wvc.allergen_gluten, wvc.allergen_soy, wvc.allergen_lactose,
         wvc.allergen_sesame, wvc.allergen_sulphites, wvc.allergen_egg,
         wvc.allergen_mustard, wvc.allergen_celery, wvc.allergen_fish,
         wvc.allergen_shellfish, wvc.allergen_nuts, wvc.allergen_peanuts,
         wvc.created_at
ORDER BY wvc.category, wvc.custom_name;

-- Step 6: Create view for dish usage
CREATE OR REPLACE VIEW v_dish_warm_veggie_usage AS
SELECT
  d.id as dish_id,
  d.name as dish_name,
  wvc.id as warm_veggie_combo_id,
  wvc.custom_name as warm_veggie_name,
  wvc.category as warm_veggie_category,
  dwvc.total_portion_g,
  json_agg(
    json_build_object(
      'component_name', comp.name,
      'percentage', wvci.percentage
    ) ORDER BY wvci.percentage DESC
  ) as warm_veggie_components
FROM dishes d
JOIN dish_warm_veggie_combinations dwvc ON dwvc.main_dish_id = d.id
JOIN warm_veggie_combinations wvc ON wvc.id = dwvc.warm_veggie_combination_id
JOIN warm_veggie_combination_items wvci ON wvci.warm_veggie_combination_id = wvc.id
JOIN dishes comp ON comp.id = wvci.component_dish_id
GROUP BY d.id, d.name, wvc.id, wvc.custom_name, wvc.category, dwvc.total_portion_g;

-- =====================================================
-- USAGE NOTES
-- =====================================================

-- To create a new warm veggie combination:
/*
INSERT INTO warm_veggie_combinations (
  category,
  custom_name,
  description
) VALUES (
  'root',
  'Roasted Root Vegetables',
  'Classic roasted carrots, parsnips, and potatoes'
) RETURNING id;

-- Then add components...
INSERT INTO warm_veggie_combination_items (warm_veggie_combination_id, component_dish_id, percentage)
VALUES
  (<combo_id>, <carrot_id>, 40),
  (<combo_id>, <parsnip_id>, 30),
  (<combo_id>, <potato_id>, 30);
*/

-- To view all warm veggie combinations by category:
-- SELECT * FROM v_warm_veggie_combinations_full WHERE category = 'root';

-- To rename existing warm veggie combinations:
/*
UPDATE warm_veggie_combinations SET custom_name = 'Roasted Root Vegetables' WHERE id = '<id>';
UPDATE warm_veggie_combinations SET category = 'root' WHERE id = '<id>';
*/

-- Categories:
-- 'root' = Root Vegetables (carrots, parsnips, potatoes, beets, turnips)
-- 'green' = Green Vegetables (broccoli, green beans, spinach, kale, peas)
-- 'other' = Other (mixed vegetables, ratatouille, etc.)
