-- =====================================================
-- SALAD COMBINATIONS SYSTEM
-- =====================================================
-- This migration creates a reusable salad combination system
-- organized by categories (Asian, Mediterranean, Stew, Fresh, Warm)

-- 1. Create salad_combinations table (reusable salad templates)
CREATE TABLE IF NOT EXISTS salad_combinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('asian', 'mediterranean', 'stew', 'fresh', 'warm', 'other')),
  display_number INTEGER NOT NULL, -- The number in "Asian Salad 1"
  description TEXT, -- Optional custom description
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- Ensure unique numbers within each category
  UNIQUE(category, display_number)
);

-- Auto-generated name function
CREATE OR REPLACE FUNCTION get_salad_combination_name(p_category TEXT, p_display_number INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE p_category
    WHEN 'asian' THEN 'Asian Salad ' || p_display_number
    WHEN 'mediterranean' THEN 'Mediterranean Salad ' || p_display_number
    WHEN 'stew' THEN 'Stew Salad ' || p_display_number
    WHEN 'fresh' THEN 'Fresh Salad ' || p_display_number
    WHEN 'warm' THEN 'Warm Salad ' || p_display_number
    ELSE 'Salad ' || p_display_number
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_salad_combinations_category ON salad_combinations(category);

-- 2. Create salad_combination_items table (components within a salad)
CREATE TABLE IF NOT EXISTS salad_combination_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salad_combination_id UUID NOT NULL REFERENCES salad_combinations(id) ON DELETE CASCADE,
  component_dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_salad_combination_items_combo ON salad_combination_items(salad_combination_id);
CREATE INDEX IF NOT EXISTS idx_salad_combination_items_component ON salad_combination_items(component_dish_id);

-- Ensure percentages add up to 100% for each combination
CREATE OR REPLACE FUNCTION validate_salad_combination_percentages()
RETURNS TRIGGER AS $$
DECLARE
  total_percentage DECIMAL(10,2);
BEGIN
  -- Calculate total percentage for this combination
  SELECT COALESCE(SUM(percentage), 0) INTO total_percentage
  FROM salad_combination_items
  WHERE salad_combination_id = COALESCE(NEW.salad_combination_id, OLD.salad_combination_id);

  -- Allow slightly off due to rounding (99.99 to 100.01)
  IF total_percentage < 99.99 OR total_percentage > 100.01 THEN
    RAISE EXCEPTION 'Salad combination percentages must total 100%% (current: %)', total_percentage;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: We'll validate percentages in application logic rather than with triggers
-- to allow incremental updates during editing

-- 3. Create dish_salad_combinations table (links dishes to salad combinations)
CREATE TABLE IF NOT EXISTS dish_salad_combinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  main_dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  salad_combination_id UUID NOT NULL REFERENCES salad_combinations(id) ON DELETE RESTRICT,
  total_portion_g DECIMAL(8,2) NOT NULL CHECK (total_portion_g > 0),
  created_at TIMESTAMP DEFAULT NOW(),
  -- A dish can only have one salad combination
  UNIQUE(main_dish_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dish_salad_combinations_dish ON dish_salad_combinations(main_dish_id);
CREATE INDEX IF NOT EXISTS idx_dish_salad_combinations_combo ON dish_salad_combinations(salad_combination_id);

-- =====================================================
-- MIGRATION HELPERS
-- =====================================================

-- Function to migrate existing salad_components to new system
-- This will be used to convert old data to new structure
CREATE OR REPLACE FUNCTION migrate_salad_components_to_combinations()
RETURNS TABLE(migrated_count INTEGER, created_combinations INTEGER) AS $$
DECLARE
  r RECORD;
  new_combo_id UUID;
  current_category TEXT := 'other';
  category_counter INTEGER;
BEGIN
  migrated_count := 0;
  created_combinations := 0;

  -- Loop through each main dish that has salad components
  FOR r IN
    SELECT DISTINCT main_dish_id,
           d.salad_total_portion_g
    FROM salad_components sc
    JOIN dishes d ON d.id = sc.main_dish_id
    WHERE d.salad_total_portion_g IS NOT NULL
  LOOP
    -- Get next number for 'other' category
    SELECT COALESCE(MAX(display_number), 0) + 1 INTO category_counter
    FROM salad_combinations
    WHERE category = 'other';

    -- Create new salad combination
    INSERT INTO salad_combinations (category, display_number, description)
    VALUES ('other', category_counter, 'Migrated from old system')
    RETURNING id INTO new_combo_id;

    created_combinations := created_combinations + 1;

    -- Copy all components to new structure
    INSERT INTO salad_combination_items (salad_combination_id, component_dish_id, percentage)
    SELECT new_combo_id, component_dish_id, percentage
    FROM salad_components
    WHERE main_dish_id = r.main_dish_id;

    -- Link dish to new combination
    INSERT INTO dish_salad_combinations (main_dish_id, salad_combination_id, total_portion_g)
    VALUES (r.main_dish_id, new_combo_id, r.salad_total_portion_g);

    migrated_count := migrated_count + 1;
  END LOOP;

  RETURN QUERY SELECT migrated_count, created_combinations;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR EASIER QUERYING
-- =====================================================

-- View to get salad combination details with all components
CREATE OR REPLACE VIEW v_salad_combinations_full AS
SELECT
  sc.id,
  sc.category,
  sc.display_number,
  get_salad_combination_name(sc.category, sc.display_number) as name,
  sc.description,
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
GROUP BY sc.id, sc.category, sc.display_number, sc.description, sc.created_at
ORDER BY sc.category, sc.display_number;

-- View to see which dishes use which salad combinations
CREATE OR REPLACE VIEW v_dish_salad_usage AS
SELECT
  d.id as dish_id,
  d.name as dish_name,
  sc.id as salad_combo_id,
  get_salad_combination_name(sc.category, sc.display_number) as salad_name,
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
GROUP BY d.id, d.name, sc.id, sc.category, sc.display_number, dsc.total_portion_g;

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================

-- To run this migration:
-- 1. Execute this entire file in your Supabase SQL editor
-- 2. Optionally migrate old data: SELECT * FROM migrate_salad_components_to_combinations();
-- 3. Verify: SELECT * FROM v_salad_combinations_full;

-- To create a new salad combination:
-- 1. Get next number: SELECT COALESCE(MAX(display_number), 0) + 1 FROM salad_combinations WHERE category = 'asian';
-- 2. Insert combination: INSERT INTO salad_combinations (category, display_number) VALUES ('asian', 1) RETURNING id;
-- 3. Add components: INSERT INTO salad_combination_items (salad_combination_id, component_dish_id, percentage) VALUES (combo_id, component_id, 40);
-- 4. Link to dish: INSERT INTO dish_salad_combinations (main_dish_id, salad_combination_id, total_portion_g) VALUES (dish_id, combo_id, 150);
