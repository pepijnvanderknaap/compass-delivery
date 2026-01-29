# Salad Combinations System - Implementation Guide

## Overview

This system allows you to create **reusable salad combinations** organized by categories, making it easy to add consistent salads across multiple dishes.

---

## Key Features

✅ **Categorized salads** (Asian, Mediterranean, Stew, Fresh, Warm)
✅ **Auto-numbered naming** ("Asian Salad 1", "Asian Salad 2", etc.)
✅ **Reusable combinations** - create once, use many times
✅ **Visual selection** - browse salads by category in a modal
✅ **Flexible creation** - add existing salad OR create new from scratch

---

## Database Setup

### Step 1: Run the Migration

1. Open Supabase SQL Editor
2. Copy and paste the entire contents of:
   ```
   /compass-delivery/database/migrations/create_salad_combinations_system.sql
   ```
3. Execute the script
4. Verify tables were created:
   ```sql
   SELECT * FROM salad_combinations;
   SELECT * FROM salad_combination_items;
   SELECT * FROM dish_salad_combinations;
   ```

### Step 2: Migrate Existing Data (Optional)

If you have existing salads in the old `salad_components` table:

```sql
SELECT * FROM migrate_salad_components_to_combinations();
```

This will:
- Convert all existing salad combinations to the new system
- Assign them to the "Other" category
- Link them to their original dishes
- Preserve all percentages

---

## User Interface Flow

### Adding a Salad to a Dish

When creating or editing a hot dish, you'll see two buttons in the Salad section:

```
┌─────────────────────────────────────────┐
│  [🔍 Add Existing Salad]  [➕ Create New] │
└─────────────────────────────────────────┘
```

#### Option 1: Add Existing Salad

1. Click "Add Existing Salad"
2. Select a category (Asian, Mediterranean, Stew, Fresh, Warm)
3. Browse salad cards showing:
   - Salad name ("Asian Salad 1")
   - Component list with percentages
   - Description (if any)
4. Click [Select] on a salad
5. The salad components automatically populate your dish

#### Option 2: Create New Salad

1. Click "Create New Salad"
2. Manually add components and percentages
3. Save the dish
4. (Future enhancement: Optionally save as a reusable combination)

---

## Creating Salad Combinations

### Method 1: Through the UI (Recommended for Future)

*Note: Direct creation UI is planned for a future update*

Currently, salad combinations are created by:
1. Manually entering components when creating a dish
2. Components are saved with that specific dish

### Method 2: Directly in Database

Create a new salad combination manually:

```sql
-- 1. Get next available number for category
SELECT COALESCE(MAX(display_number), 0) + 1 AS next_number
FROM salad_combinations
WHERE category = 'asian';

-- 2. Create combination (replace ? with the number from step 1)
INSERT INTO salad_combinations (category, display_number, description)
VALUES ('asian', ?, 'Light and crunchy Asian-inspired mix')
RETURNING id;

-- 3. Add components (replace <combo_id> with ID from step 2)
INSERT INTO salad_combination_items (salad_combination_id, component_dish_id, percentage)
VALUES
  ('<combo_id>', '<cabbage_component_id>', 40),
  ('<combo_id>', '<carrot_component_id>', 30),
  ('<combo_id>', '<sesame_component_id>', 30);

-- Verify percentages total 100%
SELECT
  sc.id,
  get_salad_combination_name(sc.category, sc.display_number) as name,
  SUM(sci.percentage) as total_percentage
FROM salad_combinations sc
JOIN salad_combination_items sci ON sci.salad_combination_id = sc.id
WHERE sc.id = '<combo_id>'
GROUP BY sc.id, sc.category, sc.display_number;
```

---

## Database Schema

### Tables

#### `salad_combinations`
Stores reusable salad templates

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| category | TEXT | asian, mediterranean, stew, fresh, warm, other |
| display_number | INTEGER | Auto-incrementing number within category |
| description | TEXT | Optional custom description |
| created_at | TIMESTAMP | Creation timestamp |

#### `salad_combination_items`
Components that make up a salad combination

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| salad_combination_id | UUID | FK to salad_combinations |
| component_dish_id | UUID | FK to dishes (subcategory='salad') |
| percentage | DECIMAL(5,2) | Component percentage (must total 100) |

#### `dish_salad_combinations`
Links dishes to their salad combinations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| main_dish_id | UUID | FK to dishes |
| salad_combination_id | UUID | FK to salad_combinations |
| total_portion_g | DECIMAL(8,2) | Total salad weight for this dish |

---

## Useful Queries

### View All Salad Combinations

```sql
SELECT * FROM v_salad_combinations_full;
```

### Count Salads by Category

```sql
SELECT
  category,
  COUNT(*) as salad_count
FROM salad_combinations
GROUP BY category
ORDER BY category;
```

### See Which Dishes Use a Specific Salad

```sql
SELECT * FROM v_dish_salad_usage
WHERE salad_combo_id = '<salad_id>';
```

### Find Duplicate/Similar Salads

```sql
SELECT
  sc1.id as combo1_id,
  get_salad_combination_name(sc1.category, sc1.display_number) as combo1_name,
  sc2.id as combo2_id,
  get_salad_combination_name(sc2.category, sc2.display_number) as combo2_name,
  json_agg(sci1.component_dish_id ORDER BY sci1.percentage DESC) as combo1_components,
  json_agg(sci2.component_dish_id ORDER BY sci2.percentage DESC) as combo2_components
FROM salad_combinations sc1
JOIN salad_combination_items sci1 ON sci1.salad_combination_id = sc1.id
CROSS JOIN salad_combinations sc2
JOIN salad_combination_items sci2 ON sci2.salad_combination_id = sc2.id
WHERE sc1.id < sc2.id
GROUP BY sc1.id, sc1.category, sc1.display_number, sc2.id, sc2.category, sc2.display_number
HAVING json_agg(sci1.component_dish_id ORDER BY sci1.percentage DESC) =
       json_agg(sci2.component_dish_id ORDER BY sci2.percentage DESC);
```

---

## Category Guidelines

### Asian Salad
- Ingredients: Cabbage, edamame, sesame, soy-based dressings, pickled vegetables
- Common uses: Asian-inspired dishes, stir-fries, teriyaki dishes

### Mediterranean Salad
- Ingredients: Feta, olives, cucumber, tomato, red onion, olive oil dressings
- Common uses: Greek dishes, grilled meats, Mediterranean bowls

### Stew Salad
- Ingredients: Hearty greens, root vegetables, robust ingredients
- Common uses: Stews, braised dishes, heavy comfort foods

### Fresh Salad
- Ingredients: Mixed greens, light vegetables, vinaigrettes
- Common uses: Light lunches, summer dishes, fish dishes

### Warm Salad
- Ingredients: Grilled/roasted vegetables, warm components
- Common uses: Winter dishes, warm bowls, roasted meats

### Other
- Miscellaneous combinations that don't fit other categories
- Experimental or specialty salads

---

## Cleanup of Old System

### After Migration is Complete

Once you've verified the new system works and migrated all data:

```sql
-- CAUTION: Only run after confirming new system works!

-- Option 1: Keep old table as backup (rename it)
ALTER TABLE salad_components RENAME TO salad_components_backup_20260128;

-- Option 2: Drop old table completely
DROP TABLE salad_components;
```

### Verify Before Cleanup

```sql
-- Count old salad components
SELECT COUNT(*) FROM salad_components;

-- Count new salad combinations
SELECT COUNT(*) FROM dish_salad_combinations;

-- Both counts should match if migration was successful
```

---

## Troubleshooting

### Percentages Don't Total 100%

Check the combination:
```sql
SELECT
  sc.id,
  get_salad_combination_name(sc.category, sc.display_number) as name,
  json_agg(json_build_object('component', d.name, 'percentage', sci.percentage) ORDER BY sci.percentage DESC) as breakdown,
  SUM(sci.percentage) as total
FROM salad_combinations sc
JOIN salad_combination_items sci ON sci.salad_combination_id = sc.id
JOIN dishes d ON d.id = sci.component_dish_id
GROUP BY sc.id, sc.category, sc.display_number
HAVING ABS(SUM(sci.percentage) - 100) > 0.01;
```

### Missing Components

Find combinations with missing component dishes:
```sql
SELECT
  sc.id,
  get_salad_combination_name(sc.category, sc.display_number) as name,
  sci.component_dish_id
FROM salad_combinations sc
JOIN salad_combination_items sci ON sci.salad_combination_id = sc.id
LEFT JOIN dishes d ON d.id = sci.component_dish_id
WHERE d.id IS NULL;
```

### Duplicate Combinations

Use the "Find Duplicate Salads" query above to identify and merge duplicates.

---

## Future Enhancements

- [ ] Direct "Save as Reusable Combination" button in UI
- [ ] Bulk edit salad combinations
- [ ] Salad combination preview/statistics
- [ ] Auto-suggest similar existing combinations
- [ ] Salad combination usage analytics
- [ ] Import/export salad combinations
- [ ] Salad combination templates by cuisine type

---

## Support

For questions or issues:
1. Check this guide first
2. Review the SQL migration file for additional comments
3. Use the provided views (`v_salad_combinations_full`, `v_dish_salad_usage`)
4. Check console logs in browser for frontend errors

---

**Version**: 1.0
**Last Updated**: January 28, 2026
