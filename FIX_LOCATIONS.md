# Fix Missing Locations Issue

## Problem
The Orders page shows "black output" (no data) for Atlassian and Symphony because these locations don't exist in the database yet.

## Error Message
"Failed to create weeks: new row violations" - This means the foreign key constraint is preventing order creation because the location doesn't exist.

## Solution
Run this SQL in your Supabase dashboard to add the missing locations:

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar

### Step 2: Run This SQL

```sql
-- Add missing locations if they don't exist

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
```

### Step 3: Verify
After running the SQL, refresh the Orders page and switch to Atlassian or Symphony. You should now see 4 empty week cards ready for data entry.

## Notes
- Adjust the addresses in the SQL if you have real addresses for these locations
- The SQL uses `WHERE NOT EXISTS` to avoid creating duplicates if locations already exist
- After running this once, the issue should be permanently fixed
