-- Add salad bar composition columns to location_settings table
-- Each field represents the percentage (0-1) of the total salad bar portion for that element
ALTER TABLE location_settings
ADD COLUMN IF NOT EXISTS salad_leaves_percentage DECIMAL(5,4) DEFAULT 0.05,
ADD COLUMN IF NOT EXISTS cucumber_percentage DECIMAL(5,4) DEFAULT 0.05,
ADD COLUMN IF NOT EXISTS tomato_percentage DECIMAL(5,4) DEFAULT 0.05,
ADD COLUMN IF NOT EXISTS carrot_julienne_percentage DECIMAL(5,4) DEFAULT 0.05,
ADD COLUMN IF NOT EXISTS radish_julienne_percentage DECIMAL(5,4) DEFAULT 0.05,
ADD COLUMN IF NOT EXISTS pickled_beetroot_percentage DECIMAL(5,4) DEFAULT 0.05,
ADD COLUMN IF NOT EXISTS mixed_blanched_veg_percentage DECIMAL(5,4) DEFAULT 0.07,
ADD COLUMN IF NOT EXISTS roasted_veg_1_percentage DECIMAL(5,4) DEFAULT 0.07,
ADD COLUMN IF NOT EXISTS roasted_veg_2_percentage DECIMAL(5,4) DEFAULT 0.07,
ADD COLUMN IF NOT EXISTS roasted_veg_3_percentage DECIMAL(5,4) DEFAULT 0.07,
ADD COLUMN IF NOT EXISTS potato_salad_percentage DECIMAL(5,4) DEFAULT 0.06,
ADD COLUMN IF NOT EXISTS composed_salad_percentage DECIMAL(5,4) DEFAULT 0.16,
ADD COLUMN IF NOT EXISTS pasta_salad_percentage DECIMAL(5,4) DEFAULT 0.16,
ADD COLUMN IF NOT EXISTS carb_percentage DECIMAL(5,4) DEFAULT 0.04;

-- Add comments for documentation
COMMENT ON COLUMN location_settings.salad_leaves_percentage IS 'Percentage of total salad bar portion (0-1, e.g., 0.05 = 5%)';
COMMENT ON COLUMN location_settings.cucumber_percentage IS 'Percentage of total salad bar portion (0-1, e.g., 0.05 = 5%)';
COMMENT ON COLUMN location_settings.tomato_percentage IS 'Percentage of total salad bar portion (0-1, e.g., 0.05 = 5%)';
COMMENT ON COLUMN location_settings.carrot_julienne_percentage IS 'Percentage of total salad bar portion (0-1, e.g., 0.05 = 5%)';
COMMENT ON COLUMN location_settings.radish_julienne_percentage IS 'Percentage of total salad bar portion (0-1, e.g., 0.05 = 5%)';
COMMENT ON COLUMN location_settings.pickled_beetroot_percentage IS 'Percentage of total salad bar portion (0-1, e.g., 0.05 = 5%)';
COMMENT ON COLUMN location_settings.mixed_blanched_veg_percentage IS 'Percentage of total salad bar portion (0-1, e.g., 0.07 = 7%)';
COMMENT ON COLUMN location_settings.roasted_veg_1_percentage IS 'Percentage of total salad bar portion (0-1, e.g., 0.07 = 7%)';
COMMENT ON COLUMN location_settings.roasted_veg_2_percentage IS 'Percentage of total salad bar portion (0-1, e.g., 0.07 = 7%)';
COMMENT ON COLUMN location_settings.roasted_veg_3_percentage IS 'Percentage of total salad bar portion (0-1, e.g., 0.07 = 7%)';
COMMENT ON COLUMN location_settings.potato_salad_percentage IS 'Percentage of total salad bar portion (0-1, e.g., 0.06 = 6%)';
COMMENT ON COLUMN location_settings.composed_salad_percentage IS 'Percentage of total salad bar portion (0-1, e.g., 0.16 = 16%)';
COMMENT ON COLUMN location_settings.pasta_salad_percentage IS 'Percentage of total salad bar portion (0-1, e.g., 0.16 = 16%)';
COMMENT ON COLUMN location_settings.carb_percentage IS 'Percentage of total salad bar portion (0-1, e.g., 0.04 = 4%)';

-- Note: Default percentages sum to 1.00 (100%)
-- 0.05 + 0.05 + 0.05 + 0.05 + 0.05 + 0.05 + 0.07 + 0.07 + 0.07 + 0.07 + 0.06 + 0.16 + 0.16 + 0.04 = 1.00
