-- First, let's check what locations exist
SELECT id, name, is_active FROM locations ORDER BY name;

-- Then check what dishes exist
SELECT id, name, category FROM dishes ORDER BY name;

-- Check if there's already a weekly menu for Jan 27, 2025
SELECT id, week_start_date FROM weekly_menus WHERE week_start_date = '2025-01-27';
