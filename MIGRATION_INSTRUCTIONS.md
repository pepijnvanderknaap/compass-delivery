# Database Migration Instructions

Before the menu planner can save data, you need to run this SQL in your Supabase dashboard:

## Steps:

1. Go to your Supabase dashboard: https://app.supabase.com/project/agwheuqqvdtcaqpgviya
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the SQL below
5. Click "Run" to execute

## SQL to run:

```sql
-- Add meal_type column to menu_items table
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS meal_type VARCHAR(50) CHECK (meal_type IN ('soup', 'hot_meat', 'hot_veg'));

-- Drop the old unique constraint if it exists
ALTER TABLE menu_items
DROP CONSTRAINT IF EXISTS menu_items_menu_id_dish_id_day_of_week_key;

-- Add new unique constraint that includes meal_type
-- This ensures each day can have only one dish per meal type
ALTER TABLE menu_items
ADD CONSTRAINT menu_items_unique_slot
UNIQUE(menu_id, day_of_week, meal_type);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_items_meal_type ON menu_items(meal_type);
```

## What this does:

- Adds a `meal_type` column to distinguish between soup, hot meat, and hot vegetarian dishes
- Updates the unique constraint so each day can have one soup, one hot meat, and one hot veg dish
- Creates an index for faster queries

After running this SQL, the menu planner will be able to save and load menu data with auto-save functionality!
