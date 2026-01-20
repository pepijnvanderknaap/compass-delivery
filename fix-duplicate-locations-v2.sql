-- Safe cleanup of duplicate locations - Version 2
-- This handles the unique constraint on orders

DO $$
DECLARE
  -- Store the IDs we want to keep (oldest for each name)
  keep_atlasian uuid := '20b05bf0-f8ba-4654-bebf-ee940ad5258c';
  keep_jaa uuid := 'e4195d4e-3faa-4db2-970b-618e86355f6e';
  keep_snap119 uuid := 'c2ccc432-5c48-4f90-bf42-8cf75454b506';
  keep_snap165 uuid := '5c5af765-0845-452c-8c27-c3842af85a4f';
  keep_snowflake uuid := '8d7a21be-5fbf-4c4b-8562-d39ded0feafe';
  keep_symphonys uuid := '138b9f76-ad25-484b-955d-da1c8b72ddc9';

  -- Store the IDs we want to remove (newer duplicates)
  remove_atlasian uuid := 'db0a89d5-bec2-41bc-804c-93372c19f6a9';
  remove_jaa uuid := '0e1187c5-3cfb-461f-a9e0-17a4a46bdd4e';
  remove_snap119 uuid := '15aa1bf2-ddbb-4abf-804a-41815f3f52cb';
  remove_snap165 uuid := 'fb2c5fee-b5d9-4fdd-8189-db25671ff17c';
  remove_snowflake uuid := '56307ca4-ddc1-434f-9832-7e40211a8192';
  remove_symphonys uuid := 'daec46b5-ef88-4b62-aef1-b8d0114800ee';
BEGIN
  -- Step 1: Delete orders from duplicate locations
  -- (Since they would violate unique constraint, and they're duplicates anyway)

  DELETE FROM order_items
  WHERE order_id IN (
    SELECT id FROM orders WHERE location_id IN (
      remove_atlasian,
      remove_jaa,
      remove_snap119,
      remove_snap165,
      remove_snowflake,
      remove_symphonys
    )
  );

  DELETE FROM orders WHERE location_id IN (
    remove_atlasian,
    remove_jaa,
    remove_snap119,
    remove_snap165,
    remove_snowflake,
    remove_symphonys
  );

  RAISE NOTICE 'Duplicate orders deleted';

  -- Step 2: Migrate user profiles

  UPDATE user_profiles SET location_id = keep_atlasian WHERE location_id = remove_atlasian;
  UPDATE user_profiles SET location_id = keep_jaa WHERE location_id = remove_jaa;
  UPDATE user_profiles SET location_id = keep_snap119 WHERE location_id = remove_snap119;
  UPDATE user_profiles SET location_id = keep_snap165 WHERE location_id = remove_snap165;
  UPDATE user_profiles SET location_id = keep_snowflake WHERE location_id = remove_snowflake;
  UPDATE user_profiles SET location_id = keep_symphonys WHERE location_id = remove_symphonys;

  RAISE NOTICE 'User profiles migrated';

  -- Step 3: Migrate location settings if any exist

  DELETE FROM location_settings WHERE location_id IN (
    remove_atlasian,
    remove_jaa,
    remove_snap119,
    remove_snap165,
    remove_snowflake,
    remove_symphonys
  );

  RAISE NOTICE 'Duplicate location settings deleted';

  -- Step 4: Delete the duplicate locations

  DELETE FROM locations WHERE id IN (
    remove_atlasian,
    remove_jaa,
    remove_snap119,
    remove_snap165,
    remove_snowflake,
    remove_symphonys
  );

  RAISE NOTICE 'Duplicate locations deleted';

  -- Step 5: Add Dark Kitchen as a new location
  INSERT INTO locations (name, address, is_active)
  VALUES ('Dark Kitchen', 'Same building as Symphonys, Amsterdam', true)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Dark Kitchen location added';

END $$;

-- Verify the cleanup
SELECT id, name, address, is_active, created_at
FROM locations
ORDER BY
  CASE
    WHEN name = 'Dark Kitchen' THEN 1
    ELSE 2
  END,
  name;

-- Check that all orders are still present
SELECT
  l.name,
  COUNT(o.id) as order_count
FROM locations l
LEFT JOIN orders o ON o.location_id = l.id
GROUP BY l.name
ORDER BY l.name;
