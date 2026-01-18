# Allergen Migration Instructions

Before the allergen tracking works, you need to run this SQL in your Supabase dashboard:

## Steps:

1. Go to your Supabase dashboard: https://app.supabase.com/project/agwheuqqvdtcaqpgviya
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the SQL below
5. Click "Run" to execute

## SQL to run:

```sql
-- Add allergen fields to dishes table
ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS allergen_gluten BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergen_soy BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergen_lactose BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergen_sesame BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergen_sulphites BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergen_egg BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergen_mustard BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergen_celery BOOLEAN DEFAULT false;
```

## What this does:

- Adds 8 boolean fields to track allergens for each dish
- Each allergen can be marked true/false (checked/unchecked)
- Defaults to false (no allergen) for existing dishes

After running this SQL, the dish management interface will show allergen checkboxes!
