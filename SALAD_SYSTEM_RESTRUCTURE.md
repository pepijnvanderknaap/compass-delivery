# Salad System Restructure - Implementation Guide

## Overview

The salad combinations system has been restructured for simplicity and clarity:

### Old System (Before)
- ❌ 6 categories: asian, mediterranean, stew, fresh, warm, other
- ❌ Auto-numbered names: "Asian Salad 1", "Mediterranean Salad 2"
- ❌ No allergen tracking on salads
- ❌ No custom naming

### New System (After)
- ✅ 3 categories: leafy, vegetable, coleslaw
- ✅ Custom names: "Greek Salad", "Indian Coleslaw", "Warm Vegetable Salad"
- ✅ Allergen tracking per salad (nuts, lactose/feta, etc.)
- ✅ More descriptive and organized

---

## Step 1: Run Database Migration

Execute this SQL in your Supabase SQL Editor:

```
/compass-delivery/database/migrations/restructure_salad_combinations.sql
```

This migration will:
1. Add `custom_name` field to salad_combinations
2. Add 12 allergen fields to salad_combinations
3. Change category constraint to only allow: leafy, vegetable, coleslaw
4. Migrate existing data (best effort mapping):
   - fresh, mediterranean → leafy
   - warm, stew, asian → vegetable
   - other → coleslaw
5. Update views to include custom names and allergens

---

## Step 2: Rename Your Existing Salads

After migration, all salads will have placeholder names like "Salad Mix 1", "Salad Mix 2".

Update them with proper names:

```sql
-- Example: Update salad names
UPDATE salad_combinations
SET custom_name = 'Greek Salad',
    allergen_lactose = true  -- Contains feta cheese
WHERE id = '<salad_id>';

UPDATE salad_combinations
SET custom_name = 'Indian Coleslaw'
WHERE id = '<salad_id>';

UPDATE salad_combinations
SET custom_name = 'Warm Vegetable Salad'
WHERE id = '<salad_id>';

-- View all salads to identify them:
SELECT
  id,
  category,
  custom_name,
  components
FROM v_salad_combinations_full;
```

---

## Step 3: Set Allergens for Salads

Update allergens for each salad as needed:

```sql
-- Example: Greek Salad with feta cheese
UPDATE salad_combinations
SET
  allergen_lactose = true,  -- Feta cheese
  allergen_sulphites = false
WHERE custom_name = 'Greek Salad';

-- Example: Asian Sesame Coleslaw
UPDATE salad_combinations
SET
  allergen_sesame = true,
  allergen_soy = true
WHERE custom_name = 'Asian Sesame Coleslaw';

-- Example: Walnut Salad
UPDATE salad_combinations
SET
  allergen_nuts = true
WHERE custom_name = 'Walnut Salad';
```

---

## New UI Flow

### Adding Existing Salad to a Dish

1. Click "Add Existing Salad" button
2. Select salad type:
   - 🥗 Leafy Salads (lettuce, mixed greens, spinach-based)
   - 🥕 Vegetable Salads (roasted, grilled, or raw vegetables)
   - 🥬 Coleslaws (cabbage-based salads and slaws)
3. Browse salads by custom name with allergen badges
4. Click to select

### Creating New Salad

1. Click "Create New Salad" button
2. Future enhancement: Will ask for:
   - Salad type (leafy/vegetable/coleslaw)
   - Custom name
   - Components with percentages
   - Allergens

---

## Database Schema Changes

### Updated `salad_combinations` table:

```sql
CREATE TABLE salad_combinations (
  id UUID PRIMARY KEY,
  category TEXT CHECK (category IN ('leafy', 'vegetable', 'coleslaw')),  -- CHANGED
  custom_name TEXT NOT NULL UNIQUE,  -- NEW
  description TEXT,

  -- NEW: Allergen fields
  allergen_gluten BOOLEAN DEFAULT FALSE,
  allergen_soy BOOLEAN DEFAULT FALSE,
  allergen_lactose BOOLEAN DEFAULT FALSE,
  allergen_sesame BOOLEAN DEFAULT FALSE,
  allergen_sulphites BOOLEAN DEFAULT FALSE,
  allergen_egg BOOLEAN DEFAULT FALSE,
  allergen_mustard BOOLEAN DEFAULT FALSE,
  allergen_celery BOOLEAN DEFAULT FALSE,
  allergen_fish BOOLEAN DEFAULT FALSE,
  allergen_shellfish BOOLEAN DEFAULT FALSE,
  allergen_nuts BOOLEAN DEFAULT FALSE,
  allergen_peanuts BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Updated Views

### `v_salad_combinations_full`

Now includes:
- `custom_name` as `name`
- All allergen fields
- Components with percentages

```sql
SELECT * FROM v_salad_combinations_full WHERE category = 'leafy';
```

---

## Benefits of New System

1. **Simpler** - 3 categories instead of 6
2. **More descriptive** - Actual salad names instead of numbers
3. **Safer** - Allergens tracked per salad
4. **Better UX** - Easier to find "Greek Salad" than "Mediterranean Salad 3"
5. **More flexible** - Can name salads anything meaningful

---

## Migration Checklist

- [ ] Run `restructure_salad_combinations.sql` in Supabase
- [ ] Verify migration succeeded
- [ ] Query all salads: `SELECT * FROM v_salad_combinations_full;`
- [ ] Rename each salad from "Salad Mix X" to proper names
- [ ] Set allergens for salads that contain them
- [ ] Test UI: Create a dish and browse salads
- [ ] Verify allergen badges show correctly

---

## Example Salad Names by Category

### Leafy Salads
- Greek Salad
- Caesar Salad
- Mixed Greens with Vinaigrette
- Spinach & Feta Salad

### Vegetable Salads
- Warm Roasted Vegetable Salad
- Mediterranean Grilled Vegetables
- Asian Stir-Fry Vegetables
- Ratatouille Salad

### Coleslaws
- Classic Coleslaw
- Asian Sesame Coleslaw
- Indian Spiced Coleslaw
- Creamy Red Cabbage Slaw

---

**Status**: Ready to migrate
**Risk**: Low (with proper backup)
**Rollback**: Keep old data until verified working
