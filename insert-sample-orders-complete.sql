-- Insert sample orders for Monday, January 26, 2026 (all 6 locations)
-- Based on your actual location and dish names

DO $$
DECLARE
  snapchat119_id uuid := 'b8e3f8a5-4c6d-4e9a-8f1b-2c5d7e9a1b3c'; -- SnapChat 119 - REPLACE WITH ACTUAL ID
  snapchat165_id uuid := '5c5af765-0845-452c-8c27-c3842af85a4f'; -- SnapChat 165
  symphony_id uuid := 'daec46b5-ef88-4b62-aef1-b8d0114800ee'; -- Symphonys
  atlassian_id uuid := 'db0a89d5-bec2-41bc-804c-93372c19f6a9'; -- Atlasian
  snowflake_id uuid := '56307ca4-ddc1-434f-9832-7e40211a8192'; -- Snowflake
  jaa_id uuid := 'e4195d4e-3faa-4db2-970b-618e86355f6e'; -- JAA Training

  mulligatawny_id uuid := '4a0ca1d5-bb32-49fd-be56-8d7a83ba9262'; -- Mulligatawny
  chicken_biryani_id uuid := 'a49fdf50-f04b-46b0-9d9b-369446f699ff'; -- Chicken Biryani
  mixed_veg_id uuid := 'c74cdcc6-00b8-498f-8c55-0b93771b6ba1'; -- Mixed Veg Biryani

  order_snap119 uuid;
  order_snap165 uuid;
  order_symphony uuid;
  order_atlassian uuid;
  order_snowflake uuid;
  order_jaa uuid;
BEGIN
  -- First, get the actual SnapChat 119 ID
  SELECT id INTO snapchat119_id FROM locations WHERE name LIKE '%119%' LIMIT 1;

  -- Create orders for each location for week starting Jan 26, 2026

  -- SnapChat 119 (assume 150 portions total)
  IF snapchat119_id IS NOT NULL THEN
    INSERT INTO orders (location_id, week_start_date, created_at, updated_at)
    VALUES (snapchat119_id, '2026-01-26', NOW(), NOW())
    RETURNING id INTO order_snap119;

    INSERT INTO order_items (order_id, dish_id, delivery_date, portions, created_at, updated_at)
    VALUES
      (order_snap119, mulligatawny_id, '2026-01-26', 50, NOW(), NOW()),
      (order_snap119, chicken_biryani_id, '2026-01-26', 60, NOW(), NOW()),
      (order_snap119, mixed_veg_id, '2026-01-26', 40, NOW(), NOW());
  END IF;

  -- SnapChat 165 (165 portions total)
  INSERT INTO orders (location_id, week_start_date, created_at, updated_at)
  VALUES (snapchat165_id, '2026-01-26', NOW(), NOW())
  RETURNING id INTO order_snap165;

  INSERT INTO order_items (order_id, dish_id, delivery_date, portions, created_at, updated_at)
  VALUES
    (order_snap165, mulligatawny_id, '2026-01-26', 55, NOW(), NOW()),
    (order_snap165, chicken_biryani_id, '2026-01-26', 66, NOW(), NOW()),
    (order_snap165, mixed_veg_id, '2026-01-26', 44, NOW(), NOW());

  -- Symphonys (80 portions total)
  INSERT INTO orders (location_id, week_start_date, created_at, updated_at)
  VALUES (symphony_id, '2026-01-26', NOW(), NOW())
  RETURNING id INTO order_symphony;

  INSERT INTO order_items (order_id, dish_id, delivery_date, portions, created_at, updated_at)
  VALUES
    (order_symphony, mulligatawny_id, '2026-01-26', 27, NOW(), NOW()),
    (order_symphony, chicken_biryani_id, '2026-01-26', 32, NOW(), NOW()),
    (order_symphony, mixed_veg_id, '2026-01-26', 21, NOW(), NOW());

  -- Atlasian (100 portions total)
  INSERT INTO orders (location_id, week_start_date, created_at, updated_at)
  VALUES (atlassian_id, '2026-01-26', NOW(), NOW())
  RETURNING id INTO order_atlassian;

  INSERT INTO order_items (order_id, dish_id, delivery_date, portions, created_at, updated_at)
  VALUES
    (order_atlassian, mulligatawny_id, '2026-01-26', 33, NOW(), NOW()),
    (order_atlassian, chicken_biryani_id, '2026-01-26', 40, NOW(), NOW()),
    (order_atlassian, mixed_veg_id, '2026-01-26', 27, NOW(), NOW());

  -- Snowflake (55 portions total)
  INSERT INTO orders (location_id, week_start_date, created_at, updated_at)
  VALUES (snowflake_id, '2026-01-26', NOW(), NOW())
  RETURNING id INTO order_snowflake;

  INSERT INTO order_items (order_id, dish_id, delivery_date, portions, created_at, updated_at)
  VALUES
    (order_snowflake, mulligatawny_id, '2026-01-26', 18, NOW(), NOW()),
    (order_snowflake, chicken_biryani_id, '2026-01-26', 22, NOW(), NOW()),
    (order_snowflake, mixed_veg_id, '2026-01-26', 15, NOW(), NOW());

  -- JAA Training (35 portions total)
  INSERT INTO orders (location_id, week_start_date, created_at, updated_at)
  VALUES (jaa_id, '2026-01-26', NOW(), NOW())
  RETURNING id INTO order_jaa;

  INSERT INTO order_items (order_id, dish_id, delivery_date, portions, created_at, updated_at)
  VALUES
    (order_jaa, mulligatawny_id, '2026-01-26', 12, NOW(), NOW()),
    (order_jaa, chicken_biryani_id, '2026-01-26', 14, NOW(), NOW()),
    (order_jaa, mixed_veg_id, '2026-01-26', 9, NOW(), NOW());

  RAISE NOTICE 'Sample orders created successfully for all locations!';
END $$;
