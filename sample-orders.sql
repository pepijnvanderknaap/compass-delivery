-- Sample orders for Monday, January 27th (tomorrow)
-- Snapchat: 165, Symphony: 80, Atlassian: 100, Snowflake: 55, J.A.A.: 35

-- First, get the location IDs (run this to see your location IDs)
-- SELECT id, name FROM locations;

-- Then create orders for the week starting Jan 27, 2025
-- Replace the location_id values with your actual location IDs from the query above

DO $$
DECLARE
  snapchat_id uuid;
  symphony_id uuid;
  atlassian_id uuid;
  snowflake_id uuid;
  jaa_id uuid;
  mulligatawny_id uuid;
  chicken_biryani_id uuid;
  mixed_veg_id uuid;
  order_snapchat uuid;
  order_symphony uuid;
  order_atlassian uuid;
  order_snowflake uuid;
  order_jaa uuid;
BEGIN
  -- Get location IDs (adjust names if different in your DB)
  SELECT id INTO snapchat_id FROM locations WHERE name = 'Snapchat' LIMIT 1;
  SELECT id INTO symphony_id FROM locations WHERE name = 'Symphony' LIMIT 1;
  SELECT id INTO atlassian_id FROM locations WHERE name = 'Atlassian' LIMIT 1;
  SELECT id INTO snowflake_id FROM locations WHERE name = 'Snowflake' LIMIT 1;
  SELECT id INTO jaa_id FROM locations WHERE name = 'J.A.A.' LIMIT 1;

  -- Get dish IDs
  SELECT id INTO mulligatawny_id FROM dishes WHERE name = 'Mulligatawny' LIMIT 1;
  SELECT id INTO chicken_biryani_id FROM dishes WHERE name = 'Chicken Biryani' LIMIT 1;
  SELECT id INTO mixed_veg_id FROM dishes WHERE name = 'Mixed Veg Biryani' LIMIT 1;

  -- Create orders for each location for week starting Jan 27, 2025
  -- Snapchat (165 portions per day)
  INSERT INTO orders (location_id, week_start_date, created_at, updated_at)
  VALUES (snapchat_id, '2025-01-27', NOW(), NOW())
  RETURNING id INTO order_snapchat;

  INSERT INTO order_items (order_id, dish_id, delivery_date, portions, created_at, updated_at)
  VALUES
    (order_snapchat, mulligatawny_id, '2025-01-27', 55, NOW(), NOW()),
    (order_snapchat, chicken_biryani_id, '2025-01-27', 66, NOW(), NOW()),
    (order_snapchat, mixed_veg_id, '2025-01-27', 44, NOW(), NOW());

  -- Symphony (80 portions per day)
  INSERT INTO orders (location_id, week_start_date, created_at, updated_at)
  VALUES (symphony_id, '2025-01-27', NOW(), NOW())
  RETURNING id INTO order_symphony;

  INSERT INTO order_items (order_id, dish_id, delivery_date, portions, created_at, updated_at)
  VALUES
    (order_symphony, mulligatawny_id, '2025-01-27', 27, NOW(), NOW()),
    (order_symphony, chicken_biryani_id, '2025-01-27', 32, NOW(), NOW()),
    (order_symphony, mixed_veg_id, '2025-01-27', 21, NOW(), NOW());

  -- Atlassian (100 portions per day)
  INSERT INTO orders (location_id, week_start_date, created_at, updated_at)
  VALUES (atlassian_id, '2025-01-27', NOW(), NOW())
  RETURNING id INTO order_atlassian;

  INSERT INTO order_items (order_id, dish_id, delivery_date, portions, created_at, updated_at)
  VALUES
    (order_atlassian, mulligatawny_id, '2025-01-27', 33, NOW(), NOW()),
    (order_atlassian, chicken_biryani_id, '2025-01-27', 40, NOW(), NOW()),
    (order_atlassian, mixed_veg_id, '2025-01-27', 27, NOW(), NOW());

  -- Snowflake (55 portions per day)
  INSERT INTO orders (location_id, week_start_date, created_at, updated_at)
  VALUES (snowflake_id, '2025-01-27', NOW(), NOW())
  RETURNING id INTO order_snowflake;

  INSERT INTO order_items (order_id, dish_id, delivery_date, portions, created_at, updated_at)
  VALUES
    (order_snowflake, mulligatawny_id, '2025-01-27', 18, NOW(), NOW()),
    (order_snowflake, chicken_biryani_id, '2025-01-27', 22, NOW(), NOW()),
    (order_snowflake, mixed_veg_id, '2025-01-27', 15, NOW(), NOW());

  -- J.A.A. (35 portions per day)
  INSERT INTO orders (location_id, week_start_date, created_at, updated_at)
  VALUES (jaa_id, '2025-01-27', NOW(), NOW())
  RETURNING id INTO order_jaa;

  INSERT INTO order_items (order_id, dish_id, delivery_date, portions, created_at, updated_at)
  VALUES
    (order_jaa, mulligatawny_id, '2025-01-27', 12, NOW(), NOW()),
    (order_jaa, chicken_biryani_id, '2025-01-27', 14, NOW(), NOW()),
    (order_jaa, mixed_veg_id, '2025-01-27', 9, NOW(), NOW());

END $$;
