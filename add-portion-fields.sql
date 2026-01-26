-- Add total portion size fields for salad and warm veggie combinations
ALTER TABLE dishes 
ADD COLUMN IF NOT EXISTS salad_total_portion_g INTEGER,
ADD COLUMN IF NOT EXISTS warm_veggie_total_portion_g INTEGER;

-- Add comments
COMMENT ON COLUMN dishes.salad_total_portion_g IS 'Total portion size in grams for the salad combination (e.g., 220g total salad)';
COMMENT ON COLUMN dishes.warm_veggie_total_portion_g IS 'Total portion size in grams for the warm veggie combination (e.g., 180g total veggies)';
