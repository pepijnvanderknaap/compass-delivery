# Database Cleanup Analysis - Salad Combinations Migration

## Overview

This document analyzes the database changes needed for the salad combinations system and provides cleanup recommendations.

---

## Current State (Before Migration)

### Existing Tables

#### `salad_components`
```sql
CREATE TABLE salad_components (
  id UUID PRIMARY KEY,
  main_dish_id UUID REFERENCES dishes(id),
  component_dish_id UUID REFERENCES dishes(id),
  percentage DECIMAL(5,2)
);
```

**Issues:**
- ❌ No reusability - each dish creates its own salad from scratch
- ❌ Duplicate salad combinations across different dishes
- ❌ No categorization
- ❌ No easy way to browse existing salads
- ❌ Difficult to find similar salads

#### `warm_veggie_components`
Similar structure to `salad_components` with the same issues.

---

## New State (After Migration)

### New Tables

#### 1. `salad_combinations`
Stores reusable salad templates organized by category

**Benefits:**
- ✅ Reusable across multiple dishes
- ✅ Categorized for easy browsing
- ✅ Auto-numbered naming system
- ✅ Reduces duplication

#### 2. `salad_combination_items`
Components that make up each combination

**Benefits:**
- ✅ Normalized structure
- ✅ Easy to query component usage
- ✅ Percentage validation

#### 3. `dish_salad_combinations`
Links dishes to their salad combinations

**Benefits:**
- ✅ Many dishes can share one combination
- ✅ Each dish can have different portion sizes
- ✅ Easy to find which dishes use which salads
- ✅ Updating a combination updates all dishes using it

---

## Migration Path

### Phase 1: Install New System (✅ Complete)

1. Run migration SQL script
2. Creates new tables alongside old tables
3. No disruption to existing functionality

### Phase 2: Data Migration (🔄 Ready to Execute)

```sql
-- Execute migration function
SELECT * FROM migrate_salad_components_to_combinations();
```

**What this does:**
- Reads all existing `salad_components` records
- Creates new `salad_combinations` (assigned to "Other" category)
- Copies components to `salad_combination_items`
- Links dishes via `dish_salad_combinations`
- Preserves all percentages and portion sizes

**Result:**
```
migrated_count     | Number of dishes migrated
created_combinations | Number of new salad combinations created
```

### Phase 3: Verification (⏳ Pending)

**Run these queries to verify:**

```sql
-- 1. Check all dishes were migrated
SELECT
  (SELECT COUNT(DISTINCT main_dish_id) FROM salad_components) as old_count,
  (SELECT COUNT(*) FROM dish_salad_combinations) as new_count;
-- Both should match

-- 2. Check percentages are preserved
SELECT
  sc.main_dish_id,
  d.name as dish_name,
  SUM(sc.percentage) as old_total
FROM salad_components sc
JOIN dishes d ON d.id = sc.main_dish_id
GROUP BY sc.main_dish_id, d.name
HAVING ABS(SUM(sc.percentage) - 100) > 0.01;
-- Should return 0 rows

SELECT
  dsc.main_dish_id,
  d.name as dish_name,
  SUM(sci.percentage) as new_total
FROM dish_salad_combinations dsc
JOIN salad_combination_items sci ON sci.salad_combination_id = dsc.salad_combination_id
JOIN dishes d ON d.id = dsc.main_dish_id
GROUP BY dsc.main_dish_id, d.name
HAVING ABS(SUM(sci.percentage) - 100) > 0.01;
-- Should return 0 rows

-- 3. Check component counts match
SELECT
  'old_system' as system,
  COUNT(*) as total_component_links
FROM salad_components
UNION ALL
SELECT
  'new_system' as system,
  COUNT(*) as total_component_links
FROM salad_combination_items sci
JOIN dish_salad_combinations dsc ON dsc.salad_combination_id = sci.salad_combination_id;
```

### Phase 4: Categorization (🎯 Manual Task)

After migration, all salads are in "Other" category. Recommended steps:

```sql
-- 1. View all combinations
SELECT * FROM v_salad_combinations_full;

-- 2. Update categories based on content
UPDATE salad_combinations
SET category = 'asian'
WHERE id IN (
  SELECT sc.id
  FROM salad_combinations sc
  JOIN salad_combination_items sci ON sci.salad_combination_id = sc.id
  JOIN dishes d ON d.id = sci.component_dish_id
  WHERE d.name ILIKE '%cabbage%'
     OR d.name ILIKE '%sesame%'
     OR d.name ILIKE '%edamame%'
);

UPDATE salad_combinations
SET category = 'mediterranean'
WHERE id IN (
  SELECT sc.id
  FROM salad_combinations sc
  JOIN salad_combination_items sci ON sci.salad_combination_id = sc.id
  JOIN dishes d ON d.id = sci.component_dish_id
  WHERE d.name ILIKE '%feta%'
     OR d.name ILIKE '%olive%'
     OR d.name ILIKE '%cucumber%'
);

-- Repeat for other categories...
```

### Phase 5: Consolidation (🔧 Optional)

Find and merge duplicate combinations:

```sql
-- Find duplicates (same components, same percentages)
WITH combo_fingerprints AS (
  SELECT
    sc.id,
    sc.category,
    get_salad_combination_name(sc.category, sc.display_number) as name,
    json_agg(
      json_build_object('component', sci.component_dish_id, 'percentage', sci.percentage)
      ORDER BY sci.component_dish_id
    ) as fingerprint
  FROM salad_combinations sc
  JOIN salad_combination_items sci ON sci.salad_combination_id = sc.id
  GROUP BY sc.id, sc.category, sc.display_number
)
SELECT
  c1.name as combo1,
  c2.name as combo2,
  c1.fingerprint
FROM combo_fingerprints c1
JOIN combo_fingerprints c2 ON c1.fingerprint = c2.fingerprint AND c1.id < c2.id;
```

**To merge duplicates:**
```sql
-- Example: Merge combo2 into combo1 (keeps combo1, deletes combo2)
BEGIN;

-- Update all dishes using combo2 to use combo1
UPDATE dish_salad_combinations
SET salad_combination_id = '<combo1_id>'
WHERE salad_combination_id = '<combo2_id>';

-- Delete combo2 items
DELETE FROM salad_combination_items WHERE salad_combination_id = '<combo2_id>';

-- Delete combo2
DELETE FROM salad_combinations WHERE id = '<combo2_id>';

COMMIT;
```

### Phase 6: Cleanup Old Tables (⚠️ CAUTION)

**Only after thorough testing and verification!**

```sql
-- Option 1: Rename as backup (RECOMMENDED)
ALTER TABLE salad_components RENAME TO salad_components_backup_20260128;
ALTER TABLE warm_veggie_components RENAME TO warm_veggie_components_backup_20260128;

-- Wait 1-2 weeks, verify everything works...

-- Option 2: Drop tables (PERMANENT)
-- Only if you're 100% confident!
DROP TABLE salad_components CASCADE;
DROP TABLE warm_veggie_components CASCADE;
```

---

## Cleanup Checklist

### Before Migration
- [ ] Backup database
- [ ] Run migration script in staging environment first
- [ ] Document current salad count: `SELECT COUNT(DISTINCT main_dish_id) FROM salad_components;`

### During Migration
- [ ] Execute `create_salad_combinations_system.sql`
- [ ] Verify tables created successfully
- [ ] Run `SELECT * FROM migrate_salad_components_to_combinations();`
- [ ] Note migration results (dishes migrated, combinations created)

### After Migration
- [ ] Run all verification queries (Phase 3)
- [ ] Test UI functionality
  - [ ] Browse salad categories
  - [ ] Select existing salad
  - [ ] Create new salad
  - [ ] Edit dish with salad
  - [ ] Save dish with salad
- [ ] Manually categorize salads (Phase 4)
- [ ] Identify and merge duplicates (Phase 5)
- [ ] Wait 1-2 weeks before dropping old tables

### Final Cleanup (After 1-2 Weeks)
- [ ] Confirm no errors in production
- [ ] Rename old tables as backup
- [ ] Schedule final deletion of backups after 1 month

---

## Impact Assessment

### Tables Added
- ✅ `salad_combinations` (new)
- ✅ `salad_combination_items` (new)
- ✅ `dish_salad_combinations` (new)

### Tables to Keep (For Now)
- ⏸️ `salad_components` → rename to `salad_components_backup_20260128`
- ⏸️ `warm_veggie_components` → keep (warm veggies not migrated yet)

### Tables to Eventually Remove
- 🗑️ `salad_components_backup_20260128` (after 1 month)

### Views Added
- ✅ `v_salad_combinations_full`
- ✅ `v_dish_salad_usage`

### Functions Added
- ✅ `get_salad_combination_name(category, display_number)`
- ✅ `migrate_salad_components_to_combinations()`
- ✅ `validate_salad_combination_percentages()` (trigger function)

---

## Rollback Plan

If issues arise:

```sql
-- 1. Stop using new system in UI
-- 2. Restore from old tables
BEGIN;

-- Clear new system data
DELETE FROM dish_salad_combinations;
DELETE FROM salad_combination_items;
DELETE FROM salad_combinations;

-- Verify old tables are intact
SELECT COUNT(*) FROM salad_components;

COMMIT;

-- 3. Revert UI changes (git revert)
```

---

## Performance Considerations

### Indexes Created
All critical foreign keys and lookups are indexed:
- ✅ `salad_combinations.category` (for browsing)
- ✅ `salad_combination_items.salad_combination_id` (for lookups)
- ✅ `salad_combination_items.component_dish_id` (for component queries)
- ✅ `dish_salad_combinations.main_dish_id` (for dish queries)
- ✅ `dish_salad_combinations.salad_combination_id` (for combination queries)

### Query Performance
- **Old system**: 1 query per dish to fetch components
- **New system**: 1 query per dish + 1 query to load combination (cached in UI)
- **Browsing**: New system is significantly faster (categorized, pre-loaded)

---

## Recommendations

### Immediate Actions
1. ✅ Run migration in staging/development first
2. ✅ Test thoroughly before production
3. ⚠️ Backup database before migration
4. ✅ Keep old tables for 1-2 weeks

### Short-term (1-2 Weeks)
1. Monitor for errors or data inconsistencies
2. Categorize all "Other" salads into proper categories
3. Identify and merge duplicate combinations
4. Gather user feedback on new UI

### Long-term (1+ Month)
1. Drop old backup tables if everything is stable
2. Consider implementing same system for warm veggies
3. Add bulk editing features for combinations
4. Implement auto-categorization based on ingredients

---

## Success Metrics

### Migration Success
- ✅ All dishes migrated without data loss
- ✅ All percentages total 100%
- ✅ UI functions correctly
- ✅ No performance degradation

### User Adoption
- 📊 % of new dishes using existing combinations vs. creating new
- 📊 Average time to add salad (should decrease)
- 📊 Number of duplicate combinations created (should decrease)

### System Health
- 📊 Query performance (should be similar or better)
- 📊 Number of salad combinations (should stabilize)
- 📊 Storage usage (should be similar, possibly less)

---

**Status**: Ready for Migration
**Risk Level**: Low (with proper testing and backup)
**Rollback Time**: < 5 minutes
**Estimated Migration Time**: < 1 minute
