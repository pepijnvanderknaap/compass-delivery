-- Add missing locations if they don't exist
-- This ensures all locations in the app presets have corresponding database records

-- Check and insert Symphony
INSERT INTO locations (name, address, city, state, postal_code, country)
SELECT 'Symphony', '123 Symphony St', 'San Francisco', 'CA', '94105', 'USA'
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Symphony');

-- Check and insert Atlassian
INSERT INTO locations (name, address, city, state, postal_code, country)
SELECT 'Atlassian', '456 Atlassian Ave', 'San Francisco', 'CA', '94107', 'USA'
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Atlassian');

-- Check and insert Snowflake
INSERT INTO locations (name, address, city, state, postal_code, country)
SELECT 'Snowflake', '789 Snowflake Blvd', 'San Francisco', 'CA', '94108', 'USA'
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Snowflake');

-- Note: Adjust addresses as needed for your actual locations
