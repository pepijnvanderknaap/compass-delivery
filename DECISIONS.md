# Critical Architectural Decisions

This file documents important design decisions and implementation patterns that must be preserved across the codebase. **READ THIS FILE AT THE START OF EACH SESSION.**

---

## Production Sheets - Component Aggregation (CRITICAL)

**Date**: January 2026
**Decision**: Components shared between hot_meat and hot_veg dishes are intentionally COMBINED into a single row on production sheets.

### Why
When the same salad or component is served with both meat and vegetarian dishes, the kitchen needs to see the TOTAL quantity to prepare, not separate rows for each dish type.

### How It Works
- Production sheet groups components by `component_dish_id` and `component_type` only
- It does NOT separate by `meal_type` (hot_meat vs hot_veg)
- The "Total Salad" row shows combined portions from all hot dishes
- Example: If 96 meat orders and 11 veg orders both have salad, the production sheet shows one "Total Salad" row with 107 portions

### Code Location
- File: `/app/admin/production/page.tsx`
- Lines 262-280: Component aggregation logic
- Key: `${comp.component_dish.id}-${comp.component_type}` (no meal_type in key)

### DO NOT
- ❌ Separate salad/components by meal_type on production sheets
- ❌ Create duplicate component rows for meat vs veg dishes
- ❌ Change the aggregation key to include meal_type

### DO
- ✅ Keep component aggregation across all meal types
- ✅ Show one combined total for shared components
- ✅ Calculate weights correctly when dishes have DIFFERENT portion sizes

---

## Auto-Save Behavior

**Date**: January 2026
**Decision**: Auto-save exists in menu planner but was removed/fixed in orders page.

### Context
- Menu planner (`/app/admin/menus/page.tsx`) has auto-save with 500ms debouncing
- Orders page had problematic auto-save that caused issues - this was fixed/removed
- These are DIFFERENT behaviors - menu planner auto-save is intentional

### Code Location
- Menu planner auto-save: `/app/admin/menus/page.tsx` lines 233-332 (`autoSaveWithData`)
- Fixed with debouncing to prevent race conditions

---

## Number Input Scroll Prevention

**Date**: January 2026
**Decision**: Prevent scroll wheel from changing number input values.

### Why
Users accidentally change portion sizes (200g → 201g) when scrolling through forms.

### Implementation
- Global component: `/app/PreventNumberScrollChange.tsx`
- Prevents `wheel` events on all `<input type="number">` elements
- Modal inputs need additional `onWheel={(e) => e.preventDefault()}` since they may be in React portals

### Code Locations
- Global prevention: `/app/PreventNumberScrollChange.tsx`
- Modal form inputs: `/app/admin/dishes/MainDishForm.tsx` (percentage inputs have inline onWheel)

---

## Salad and Warm Veggie Component Storage (CRITICAL)

**Date**: January 2026
**Decision**: Salads and warm vegetables MUST be stored in dedicated tables with percentage-based breakdown.

### Why
Salads and warm veggies are composed of multiple ingredients that need precise portion control. The percentage system ensures:
- Total always adds up to 100%
- Easy to adjust ratios without recalculating weights
- Clear visibility of ingredient distribution

### How It Works
- **Salad components**: Stored in `salad_components` table with `percentage` field
- **Warm veggie components**: Stored in `warm_veggie_components` table with `percentage` field
- **Main dish fields**: `salad_total_portion_g` and `warm_veggie_total_portion_g` define total weight per portion
- **Other components** (carbs, toppings, condiments): Remain in `dish_components` table

### Example
Main dish: "Chicken Teriyaki" with `salad_total_portion_g: 100`
- Snap 119: 35% (35g per portion)
- Cucumber: 30% (30g per portion)
- Corn: 20% (20g per portion)
- Edamame: 15% (15g per portion)
- **Total: 100%** ✅

### Code Location
- Production sheet: `/app/admin/production/page.tsx` lines 270-310, 360-508
- Dish form: `/app/admin/dishes/MainDishForm.tsx`
- Dish detail modal: `/app/admin/menu-planner/components/DishDetailModal.tsx`

### DO NOT
- ❌ Store salads or warm veggies in `dish_components` table
- ❌ Create salad/warm veggie components without percentages
- ❌ Allow percentages to total anything other than 100%

### DO
- ✅ Always use `salad_components` table for salads
- ✅ Always use `warm_veggie_components` table for warm veggies
- ✅ Validate percentages add up to 100% in forms
- ✅ Set `salad_total_portion_g` or `warm_veggie_total_portion_g` on main dish

---

## Adding New Critical Decisions

When making important architectural choices:

1. Document the decision here immediately
2. Include: Date, Why, How, Code location, DO/DON'T lists
3. Update this file BEFORE implementing the change
4. Tell Claude to read this file at session start if critical work is being done

---

## Known Bugs / Active Issues

### Production Sheet Salad Calculation Bug
**Status**: RESOLVED (Jan 25, 2026)
**Issue**: Total Salad showing 53.5 kg instead of expected 10.7 kg for Snap 119 on Tue Jan 27
**Expected**: 107 portions × 100g = 10.7 kg
**Actual**: Was showing 53.5 kg (suggested using 500g per portion - cached value)

**Root Cause**:
- Line 297 set `mainDishTotalPortionG` only when aggregation object was first created
- When second dish was processed, portions were added but `mainDishTotalPortionG` was never updated or validated
- If dishes had different portion sizes (e.g., one at 500g, one at 100g), first dish's value would be used
- System had no validation to detect portion size mismatches between dishes

**Solution** (Proper Fix):
- Added `dishPortionSizes: Set<number>` to track all unique portion sizes from contributing dishes (line 224)
- When processing each dish, add its portion size to the set (line 303)
- Validate that all dishes have the same portion size - if not, log warning and use smallest value (lines 305-313)
- Total row now correctly uses validated `mainDishTotalPortionG` value (line 432)
- Formula: `totalPortions × mainDishTotalPortionG` (as originally designed)
- Console warning alerts if portion size mismatch detected between dishes

### Production Sheet Missing Salad Components Bug
**Status**: RESOLVED (Jan 26, 2026)
**Issue**: Salad components not appearing on production sheet for some days (e.g., Thursday Jan 29) while other dishes displayed correctly.

**Root Cause**:
- Production sheet only fetched from `dish_components` table
- Did NOT fetch from `salad_components` and `warm_veggie_components` tables
- Some dishes had salads in old `dish_components` table (worked)
- Other dishes had salads in new `salad_components` table (didn't work)
- Inconsistent data storage caused intermittent failures

**Solution**:
- Added queries to fetch from all three tables: `dish_components`, `salad_components`, `warm_veggie_components` (lines 184-199)
- Added processing logic for percentage-based salad/warm veggie components (lines 360-508)
- Added warning when old-style salad/warm veggie found in `dish_components` - these are now SKIPPED to enforce new way (lines 276-281)
- Enforced architectural rule: salads/warm veggies MUST use dedicated tables with percentages

**Prevention**:
- See "Salad and Warm Veggie Component Storage" decision above
- Production sheet now works regardless of which table components are in
- Old-style components are rejected with warnings to encourage migration
