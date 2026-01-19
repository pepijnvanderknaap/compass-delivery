# Dish Components Migration Instructions

This creates the relationship between main dishes and their component items (carbs, veggies, etc.)

## Steps:

1. Go to your Supabase dashboard: https://app.supabase.com/project/agwheuqqvdtcaqpgviya
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the SQL below
5. Click "Run" to execute

## SQL to run:

```sql
-- Create dish_components table to link main dishes with their component items
CREATE TABLE IF NOT EXISTS dish_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  main_dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  component_dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL CHECK (component_type IN ('topping', 'carb', 'warm_veggie', 'salad', 'condiment')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(main_dish_id, component_type, component_dish_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dish_components_main_dish ON dish_components(main_dish_id);
CREATE INDEX IF NOT EXISTS idx_dish_components_component_dish ON dish_components(component_dish_id);

-- Enable Row Level Security
ALTER TABLE dish_components ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all authenticated users to read dish_components"
  ON dish_components FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to insert dish_components"
  ON dish_components FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow admins to update dish_components"
  ON dish_components FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow admins to delete dish_components"
  ON dish_components FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
```

## What this does:

- Creates a `dish_components` table that links main dishes to their component items
- Each main dish (e.g., "Meatballs") can have multiple components:
  - 1 or more carbs (e.g., "Mashed Potato", "Rice")
  - 1 or more warm veggies (e.g., "Carrots & Peas")
  - 1 or more salads
  - 1 or more condiments
  - 1 or more toppings (for soups)
- When you change a component, only the link is updated, the component item stays in the library
- Allergens from components automatically affect the main dish
- Only admins can manage dish components
- All authenticated users can view them

After running this SQL, the dish management system will support component linking!
