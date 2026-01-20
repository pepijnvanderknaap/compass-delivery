-- Clean up duplicate locations and add Dark Kitchen

-- First, let's see what we have (run this separately to check)
-- SELECT id, name, created_at FROM locations ORDER BY name, created_at;

-- Remove duplicate locations (keep the oldest one for each name)
-- This uses a CTE to identify duplicates and delete the newer ones
WITH duplicates AS (
  SELECT id, name,
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn
  FROM locations
)
DELETE FROM locations
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add Dark Kitchen as a location if it doesn't exist
INSERT INTO locations (name, address, is_active)
VALUES ('Dark Kitchen', 'Same building as Symphonys', true)
ON CONFLICT (name) DO NOTHING;

-- Verify the cleanup
SELECT id, name, address, is_active, created_at
FROM locations
ORDER BY
  CASE
    WHEN name = 'Dark Kitchen' THEN 1
    ELSE 2
  END,
  name;
