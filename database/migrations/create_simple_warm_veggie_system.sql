-- Create simplified warm veggie system
-- Dishes link directly to vegetables (no intermediate "mix" layer)

-- Create table for dish -> vegetable components
CREATE TABLE IF NOT EXISTS dish_warm_veggie_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  component_dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  percentage INTEGER NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each vegetable can only appear once per dish
  UNIQUE(dish_id, component_dish_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dish_warm_veggie_components_dish_id
  ON dish_warm_veggie_components(dish_id);

-- Add total portion field to dishes table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dishes'
    AND column_name = 'warm_veggie_total_portion_g'
  ) THEN
    ALTER TABLE dishes ADD COLUMN warm_veggie_total_portion_g INTEGER;
  END IF;
END $$;

-- Create view for easy querying with all details
CREATE OR REPLACE VIEW v_dish_warm_veggies AS
SELECT
  dwvc.dish_id,
  dwvc.component_dish_id,
  d.name as vegetable_name,
  dwvc.percentage,
  main_dish.warm_veggie_total_portion_g as total_portion_g,
  -- Calculate actual portion for this vegetable
  CASE
    WHEN main_dish.warm_veggie_total_portion_g IS NOT NULL
    THEN ROUND((main_dish.warm_veggie_total_portion_g * dwvc.percentage / 100.0)::numeric, 0)::integer
    ELSE NULL
  END as calculated_portion_g,
  -- Include allergens from the vegetable
  d.allergen_gluten,
  d.allergen_soy,
  d.allergen_lactose,
  d.allergen_sesame,
  d.allergen_sulphites,
  d.allergen_egg,
  d.allergen_mustard,
  d.allergen_celery,
  d.allergen_fish,
  d.allergen_shellfish,
  d.allergen_nuts,
  d.allergen_peanuts
FROM dish_warm_veggie_components dwvc
JOIN dishes d ON dwvc.component_dish_id = d.id
JOIN dishes main_dish ON dwvc.dish_id = main_dish.id
ORDER BY main_dish.name, d.name;

-- Add comment
COMMENT ON TABLE dish_warm_veggie_components IS 'Simplified warm vegetable system: dishes link directly to vegetables without intermediate mix layer';
