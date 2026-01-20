-- Dishes for Monday, January 26th
-- Run this in Supabase SQL Editor

INSERT INTO dishes (name, category, subcategory, is_active, created_at, updated_at) VALUES
-- Main dishes
('Mulligatawny', 'soup', NULL, true, NOW(), NOW()),
('Chicken Biryani', 'hot_dish_meat', NULL, true, NOW(), NOW()),
('Mixed Veg Biryani', 'hot_dish_veg', NULL, true, NOW(), NOW()),

-- Soup toppings
('Chilli Oil', 'component', 'topping', true, NOW(), NOW()),
('Coriander', 'component', 'topping', true, NOW(), NOW()),

-- Carbs/Add-ons
('Naan Bread', 'component', 'condiment', true, NOW(), NOW()),
('Cucumber Raita', 'component', 'condiment', true, NOW(), NOW()),

-- Salad
('Indian Coleslaw', 'component', 'salad', true, NOW(), NOW());
