-- Sample Data for Testing Compass Kitchen Orders
-- Run this AFTER you've run supabase-schema.sql and created your first admin user

-- IMPORTANT: Replace 'your-admin-user-id' with your actual admin user UUID from Supabase Auth
-- You can find this in Supabase Dashboard > Authentication > Users

-- Sample Locations
INSERT INTO locations (name, contact_email, contact_name, is_active) VALUES
  ('Office Amsterdam Central', 'manager.amsterdam@example.com', 'Jan Bakker', true),
  ('Office Rotterdam', 'manager.rotterdam@example.com', 'Maria de Vries', true),
  ('Office Utrecht', 'manager.utrecht@example.com', 'Peter Jansen', true);

-- Sample Dishes - Soups
INSERT INTO dishes (name, category, default_portion_size_ml, is_active) VALUES
  ('Tomato Basil Soup', 'soup', 250, true),
  ('Chicken Noodle Soup', 'soup', 250, true),
  ('Butternut Squash Soup', 'soup', 250, true),
  ('Mushroom Cream Soup', 'soup', 250, true);

-- Sample Dishes - Hot Dishes (Meat)
INSERT INTO dishes (name, category, default_portion_size_g, is_active) VALUES
  ('Chicken Curry with Rice', 'hot_dish_meat', 350, true),
  ('Beef Stroganoff', 'hot_dish_meat', 350, true),
  ('Grilled Salmon with Vegetables', 'hot_dish_meat', 300, true),
  ('Pork Schnitzel with Potatoes', 'hot_dish_meat', 350, true);

-- Sample Dishes - Hot Dishes (Vegetarian)
INSERT INTO dishes (name, category, default_portion_size_g, is_active) VALUES
  ('Vegetable Pasta Primavera', 'hot_dish_vegetarian', 350, true),
  ('Lentil Dal with Rice', 'hot_dish_vegetarian', 350, true),
  ('Veggie Burger with Fries', 'hot_dish_vegetarian', 300, true),
  ('Mushroom Risotto', 'hot_dish_vegetarian', 350, true);

-- Sample Pricing for Amsterdam Office
-- First, we need to get the IDs. In a real setup, you'd query these first.
-- This is just an example - you'll need to replace these with actual UUIDs

-- Example for setting pricing (you'll need to replace UUIDs with real ones):
-- INSERT INTO location_dish_pricing (location_id, dish_id, portion_size_ml, price_per_portion)
-- SELECT
--   (SELECT id FROM locations WHERE name = 'Office Amsterdam Central'),
--   (SELECT id FROM dishes WHERE name = 'Tomato Basil Soup'),
--   250,
--   3.50;

-- To make it easier, here's a script that sets up pricing for all combinations:

-- Soups (€3.50 per portion)
INSERT INTO location_dish_pricing (location_id, dish_id, portion_size_ml, price_per_portion)
SELECT
  l.id,
  d.id,
  250,
  3.50
FROM locations l
CROSS JOIN dishes d
WHERE d.category = 'soup';

-- Hot Dishes - Meat (€7.50 per portion)
INSERT INTO location_dish_pricing (location_id, dish_id, portion_size_g, price_per_portion)
SELECT
  l.id,
  d.id,
  350,
  7.50
FROM locations l
CROSS JOIN dishes d
WHERE d.category = 'hot_dish_meat';

-- Hot Dishes - Vegetarian (€6.50 per portion)
INSERT INTO location_dish_pricing (location_id, dish_id, portion_size_g, price_per_portion)
SELECT
  l.id,
  d.id,
  350,
  6.50
FROM locations l
CROSS JOIN dishes d
WHERE d.category = 'hot_dish_vegetarian';

-- Sample Weekly Menu for next week
-- This creates a menu for the upcoming Monday with a Wednesday deadline
INSERT INTO weekly_menus (
  week_start_date,
  soup_id,
  salad_bar_available,
  hot_dish_meat_id,
  hot_dish_veg_id,
  order_deadline,
  is_published
)
SELECT
  (CURRENT_DATE + INTERVAL '7 days' - EXTRACT(DOW FROM CURRENT_DATE + INTERVAL '7 days')::int + 1) AS next_monday,
  (SELECT id FROM dishes WHERE name = 'Tomato Basil Soup' LIMIT 1),
  true,
  (SELECT id FROM dishes WHERE name = 'Chicken Curry with Rice' LIMIT 1),
  (SELECT id FROM dishes WHERE name = 'Vegetable Pasta Primavera' LIMIT 1),
  (CURRENT_DATE + INTERVAL '3 days' - EXTRACT(DOW FROM CURRENT_DATE + INTERVAL '3 days')::int + 3)::timestamp + INTERVAL '17 hours' AS wednesday_5pm,
  true;

-- Sample Weekly Menu for the week after
INSERT INTO weekly_menus (
  week_start_date,
  soup_id,
  salad_bar_available,
  hot_dish_meat_id,
  hot_dish_veg_id,
  order_deadline,
  is_published
)
SELECT
  (CURRENT_DATE + INTERVAL '14 days' - EXTRACT(DOW FROM CURRENT_DATE + INTERVAL '14 days')::int + 1) AS next_monday,
  (SELECT id FROM dishes WHERE name = 'Chicken Noodle Soup' LIMIT 1),
  true,
  (SELECT id FROM dishes WHERE name = 'Beef Stroganoff' LIMIT 1),
  (SELECT id FROM dishes WHERE name = 'Lentil Dal with Rice' LIMIT 1),
  (CURRENT_DATE + INTERVAL '10 days' - EXTRACT(DOW FROM CURRENT_DATE + INTERVAL '10 days')::int + 3)::timestamp + INTERVAL '17 hours' AS wednesday_5pm,
  true;

-- Verify the data
SELECT 'Locations created:' as info, COUNT(*) as count FROM locations;
SELECT 'Dishes created:' as info, COUNT(*) as count FROM dishes;
SELECT 'Pricing entries created:' as info, COUNT(*) as count FROM location_dish_pricing;
SELECT 'Menus created:' as info, COUNT(*) as count FROM weekly_menus;

-- Display the menus
SELECT
  week_start_date,
  (SELECT name FROM dishes WHERE id = soup_id) as soup,
  (SELECT name FROM dishes WHERE id = hot_dish_meat_id) as meat_dish,
  (SELECT name FROM dishes WHERE id = hot_dish_veg_id) as veg_dish,
  order_deadline,
  is_published
FROM weekly_menus
ORDER BY week_start_date;
