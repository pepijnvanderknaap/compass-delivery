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
