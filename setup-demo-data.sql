-- Complete Demo Setup for Compass Kitchen Orders
-- This script sets up everything needed for the demo

-- Step 1: Create demo location
INSERT INTO locations (name, contact_email, contact_name, is_active)
VALUES ('Demo Office - Amsterdam', 'demo@compass.com', 'Demo Manager', true)
ON CONFLICT DO NOTHING;

-- Step 2: Create sample dishes

-- Soups
INSERT INTO dishes (name, category, default_portion_size_ml, is_active) VALUES
  ('Tomato Basil Soup', 'soup', 250, true),
  ('Chicken Noodle Soup', 'soup', 250, true),
  ('Butternut Squash Soup', 'soup', 250, true),
  ('Mushroom Cream Soup', 'soup', 250, true)
ON CONFLICT DO NOTHING;

-- Hot Dishes - Meat/Fish
INSERT INTO dishes (name, category, default_portion_size_g, is_active) VALUES
  ('Chicken Curry with Rice', 'hot_dish_meat', 350, true),
  ('Grilled Salmon with Vegetables', 'hot_dish_meat', 300, true),
  ('Beef Stroganoff', 'hot_dish_meat', 350, true),
  ('Pork Schnitzel with Potatoes', 'hot_dish_meat', 350, true)
ON CONFLICT DO NOTHING;

-- Hot Dishes - Vegetarian
INSERT INTO dishes (name, category, default_portion_size_g, is_active) VALUES
  ('Vegetable Pasta Primavera', 'hot_dish_vegetarian', 350, true),
  ('Lentil Dal with Rice', 'hot_dish_vegetarian', 350, true),
  ('Mushroom Risotto', 'hot_dish_vegetarian', 350, true),
  ('Veggie Burger with Fries', 'hot_dish_vegetarian', 300, true)
ON CONFLICT DO NOTHING;

-- Salad Bar (if needed)
INSERT INTO dishes (name, category, default_portion_size_g, is_active) VALUES
  ('Mixed Salad Bar', 'salad_bar', 200, true)
ON CONFLICT DO NOTHING;

-- Step 3: Create user profile for the demo user
-- IMPORTANT: After creating the user in Supabase Auth, replace 'USER_ID_HERE'
-- with the actual UUID from the Supabase Dashboard

-- First, let's display the location ID we'll need
DO $$
DECLARE
  demo_location_id UUID;
BEGIN
  SELECT id INTO demo_location_id FROM locations WHERE name = 'Demo Office - Amsterdam' LIMIT 1;
  RAISE NOTICE 'Demo Location ID: %', demo_location_id;
END $$;

-- Create the user profile (run this AFTER creating the user in Supabase Auth)
-- Replace 'USER_ID_HERE' with the UUID from Supabase Dashboard > Authentication > Users
/*
INSERT INTO user_profiles (id, email, full_name, role, location_id)
VALUES (
  'USER_ID_HERE',  -- ← REPLACE THIS with your user UUID!
  'demo@compass.com',
  'Demo Manager',
  'manager',
  (SELECT id FROM locations WHERE name = 'Demo Office - Amsterdam' LIMIT 1)
);
*/

-- Verify what was created
SELECT 'Created locations:' as info;
SELECT id, name, contact_email FROM locations;

SELECT 'Created dishes:' as info;
SELECT id, name, category FROM dishes ORDER BY category, name;

SELECT 'User profiles:' as info;
SELECT id, email, full_name, role FROM user_profiles;
