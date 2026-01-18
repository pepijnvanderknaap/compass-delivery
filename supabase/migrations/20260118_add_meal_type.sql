-- Add meal_type column to menu_items table
ALTER TABLE menu_items
ADD COLUMN meal_type VARCHAR(50) CHECK (meal_type IN ('soup', 'hot_meat', 'hot_veg'));

-- Update the unique constraint to include meal_type
ALTER TABLE menu_items
DROP CONSTRAINT menu_items_menu_id_dish_id_day_of_week_key;

ALTER TABLE menu_items
ADD CONSTRAINT menu_items_unique_slot
UNIQUE(menu_id, day_of_week, meal_type);

-- Create index for better query performance
CREATE INDEX idx_menu_items_meal_type ON menu_items(meal_type);
