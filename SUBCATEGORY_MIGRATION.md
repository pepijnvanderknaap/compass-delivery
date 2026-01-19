# Subcategory Migration Instructions

Before the new subcategory system works, you need to run this SQL in your Supabase dashboard.

## Steps:

1. Go to your Supabase dashboard: https://app.supabase.com/project/agwheuqqvdtcaqpgviya
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the SQL below
5. Click "Run" to execute

## SQL to run:

```sql
-- Add subcategory field to dishes table
ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Add constraint to validate subcategory values
ALTER TABLE dishes
ADD CONSTRAINT valid_subcategory CHECK (
  subcategory IS NULL OR
  subcategory IN ('topping', 'carb', 'warm_veggie', 'salad', 'condiment')
);

-- Update the category type to include the new simplified categories
-- Note: This will be a data migration - existing dishes need to be mapped to new categories
```

## What this does:

- Adds a `subcategory` field to track dish components (toppings, carbs, veggies, salads, condiments)
- Ensures only valid subcategory values can be entered
- Subcategories apply as follows:
  - **Soups**: can have 'topping' subcategory
  - **Hot Dishes (Meat/Veg)**: can have 'carb', 'warm_veggie', 'salad', or 'condiment' subcategories

## Category Mapping:

The new simplified structure:
- `soup` - Soups (can have topping subcategory)
- `hot_dish_meat` - Hot Dish Meat (consolidates beef, chicken, pork, fish)
- `hot_dish_veg` - Hot Dish Veg (vegetarian options)
- `off_menu` - Off Menu / Bespoke

After running this SQL, the dish management interface will support subcategories!
