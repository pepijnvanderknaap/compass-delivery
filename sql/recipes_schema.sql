-- Drop existing recipes table if it exists
DROP TABLE IF EXISTS recipes CASCADE;

-- Create recipes table (Excel-style with rows)
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dish_id UUID REFERENCES dishes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_quantity DECIMAL(10,2) NOT NULL DEFAULT 25,
  base_unit TEXT NOT NULL DEFAULT 'kg',
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  cooking_loss_percentage DECIMAL(5,2) DEFAULT 8.0,
  final_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(dish_id)
);

CREATE INDEX idx_recipes_dish_id ON recipes(dish_id);
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read recipes" ON recipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert recipes" ON recipes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update recipes" ON recipes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete recipes" ON recipes FOR DELETE TO authenticated USING (true);

-- JSONB Structure for rows (Excel-like):
-- [
--   {
--     "id": "1",
--     "type": "action",
--     "text": "Roast on 200C until Cauliflower is brown & soft"
--   },
--   {
--     "id": "2",
--     "type": "ingredient",
--     "text": "Cauliflower rosets",
--     "hardValue": 7.1,
--     "multiplier": 0.284,
--     "unit": "kg",
--     "category": "vegetable"
--   },
--   {
--     "id": "3",
--     "type": "action",
--     "text": "Slowly braise in oil for 15 minutes"
--   },
--   {
--     "id": "4",
--     "type": "ingredient",
--     "text": "Onion dice",
--     "hardValue": 4.25,
--     "multiplier": 0.17,
--     "unit": "kg",
--     "category": "vegetable"
--   }
-- ]
