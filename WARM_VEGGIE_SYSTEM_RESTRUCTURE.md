# Warm Veggie System Restructure - Implementation Guide

## Overview

The warm vegetable combinations system has been restructured for simplicity and clarity, following the same approach as the salad system:

### New System
- ✅ 3 categories: root, green, other
- ✅ Custom names: "Roasted Root Vegetables", "Steamed Greens", etc.
- ✅ Allergen tracking per warm veggie combination
- ✅ More descriptive and organized

---

## Step 1: Run Database Migration

Execute this SQL in your Supabase SQL Editor:

```
/compass-delivery/database/migrations/restructure_warm_veggie_combinations.sql
```

This migration will:
1. Create `warm_veggie_combinations` table with categories: root, green, other
2. Create `warm_veggie_combination_items` table (components)
3. Create `dish_warm_veggie_combinations` table (link dishes to warm veggie combos)
4. Add 12 allergen fields to warm_veggie_combinations
5. Migrate existing data from `warm_veggie_components` to new system
6. Create views: `v_warm_veggie_combinations_full` and `v_dish_warm_veggie_usage`

---

## Step 2: Rename Your Existing Warm Veggies

After migration, all warm veggies will have placeholder names like "Warm Veggie Mix 1", "Warm Veggie Mix 2".

Update them with proper names:

```sql
-- View all warm veggie combinations
SELECT
  id,
  category,
  custom_name,
  components
FROM v_warm_veggie_combinations_full;

-- Example: Rename warm veggies
UPDATE warm_veggie_combinations
SET custom_name = 'Roasted Root Vegetables',
    category = 'root',
    description = 'Classic roasted carrots, parsnips, and potatoes'
WHERE id = '<warm_veggie_id>';

UPDATE warm_veggie_combinations
SET custom_name = 'Steamed Green Beans',
    category = 'green'
WHERE id = '<warm_veggie_id>';

UPDATE warm_veggie_combinations
SET custom_name = 'Ratatouille',
    category = 'other',
    description = 'Mediterranean vegetable stew'
WHERE id = '<warm_veggie_id>';
```

---

## Step 3: Set Allergens for Warm Veggies

Update allergens for each warm veggie as needed:

```sql
-- Example: Warm veggie with allergens
UPDATE warm_veggie_combinations
SET
  allergen_celery = true,
  allergen_sulphites = true
WHERE custom_name = 'Mixed Vegetable Medley';
```

---

## New UI Flow

### Adding Existing Warm Veggie to a Dish

1. Click "Add Existing Warm Veggie" button
2. Select warm veggie type:
   - 🥕 Root Vegetables (carrots, parsnips, potatoes, beets, turnips)
   - 🥦 Green Vegetables (broccoli, green beans, spinach, kale, peas)
   - 🍆 Other (mixed vegetables, ratatouille, etc.)
3. Browse warm veggies by custom name with allergen badges
4. Click to select

### Creating New Warm Veggie

1. Click "Create New Warm Veggie" button
2. Future enhancement: Will ask for:
   - Warm veggie type (root/green/other)
   - Custom name
   - Components with percentages
   - Allergens

---

## Database Schema

### `warm_veggie_combinations` table:

```sql
CREATE TABLE warm_veggie_combinations (
  id UUID PRIMARY KEY,
  category TEXT CHECK (category IN ('root', 'green', 'other')),
  custom_name TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Allergen fields (12 total)
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

## Category Definitions

### Root Vegetables (root)
Examples:
- Roasted Root Vegetables
- Glazed Carrots & Parsnips
- Mashed Potatoes
- Roasted Beets
- Braised Turnips

### Green Vegetables (green)
Examples:
- Steamed Broccoli
- Sautéed Green Beans
- Braised Kale
- Steamed Spinach
- Peas & Carrots

### Other (other)
Examples:
- Ratatouille
- Mixed Vegetable Medley
- Grilled Mediterranean Vegetables
- Asian Stir-Fry Vegetables
- Caponata

---

## Benefits of New System

1. **Simpler** - 3 categories instead of custom per-dish definitions
2. **More descriptive** - Actual warm veggie names instead of generic "components"
3. **Safer** - Allergens tracked per warm veggie combination
4. **Better UX** - Easier to find "Roasted Root Vegetables" than individual components
5. **More flexible** - Can name warm veggies anything meaningful
6. **Consistent** - Same structure as salad system

---

## Migration Checklist

- [ ] Run `restructure_warm_veggie_combinations.sql` in Supabase
- [ ] Verify migration succeeded
- [ ] Query all warm veggies: `SELECT * FROM v_warm_veggie_combinations_full;`
- [ ] Rename each warm veggie from "Warm Veggie Mix X" to proper names
- [ ] Set allergens for warm veggies that contain them
- [ ] Test UI: Create a dish and browse warm veggies
- [ ] Verify allergen badges show correctly
- [ ] Link existing dishes to renamed warm veggie combinations

---

**Status**: Ready to migrate
**Risk**: Low (with proper backup)
**Rollback**: Old `warm_veggie_components` table preserved
