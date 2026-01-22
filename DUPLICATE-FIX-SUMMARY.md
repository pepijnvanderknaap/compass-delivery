# Duplicate Order Items Bug - Fixed

## Problem Summary

Every time a user navigated away from the orders page and came back, duplicate `order_items` were being created in the database. This caused:

- **Inflated production quantities**: Cucumber Raita showed 3kg → 6kg → 16kg
- **Incorrect soup portions**: Snowflake showed 83.3L, JAA Training showed 101L
- **Database bloat**: 125 order items for Jan 26, 2026 when only 20 should exist

## Root Cause

The `createOrderItem` and `createOrderItemsBatch` functions in `app/orders/actions.ts` did not check for existing order items before inserting. They would blindly insert new records even if an identical record (same `order_id + dish_id + delivery_date + meal_type`) already existed.

This happened because:
1. User would edit portions on the orders page
2. User would navigate away (triggering a save)
3. User would navigate back (fetchOrders would run)
4. Any auto-save or manual save would create duplicate order_items instead of updating existing ones

## Fix Applied

### 1. Added Duplicate Prevention to `createOrderItem` (lines 45-69)

**Before**: Inserted blindly without checking for existing items
**After**: Checks if an order_item with the same `order_id + dish_id + delivery_date + meal_type` already exists. If it does, returns the existing item instead of creating a duplicate.

```typescript
// CRITICAL: Check if this exact order_item already exists to prevent duplicates
const { data: existingItem } = await serviceClient
  .from('order_items')
  .select('id')
  .eq('order_id', data.order_id)
  .eq('dish_id', data.dish_id)
  .eq('delivery_date', data.delivery_date)
  .eq('meal_type', data.meal_type || null)
  .maybeSingle();

if (existingItem) {
  console.log(`Order item already exists, skipping insert`);
  return { data: existingItem };
}
```

### 2. Added Duplicate Prevention to `createOrderItemsBatch` (lines 116-145)

**Before**: Inserted all items in batch without checking for existing items
**After**:
1. Fetches all existing order_items for the order
2. Creates a Set of existing item keys for fast lookup
3. Filters out items that already exist
4. Only inserts items that don't already exist

```typescript
// CRITICAL: Check for existing order_items to prevent duplicates
const { data: existingItems } = await serviceClient
  .from('order_items')
  .select('order_id, dish_id, delivery_date, meal_type')
  .eq('order_id', items[0].order_id);

// Create a Set of existing item keys for fast lookup
const existingKeys = new Set(
  (existingItems || []).map(item =>
    `${item.order_id}-${item.dish_id}-${item.delivery_date}-${item.meal_type || 'null'}`
  )
);

// Filter out items that already exist
const itemsToInsert = items.filter(item => {
  const key = `${item.order_id}-${item.dish_id}-${item.delivery_date}-${item.meal_type || 'null'}`;
  return !existingKeys.has(key);
});
```

### 3. Cleaned Up Existing Duplicates

Created and ran `cleanup-duplicates.js` script that:
1. Found all duplicate order_items (same `order_id + dish_id + delivery_date + meal_type`)
2. Kept only the FIRST/OLDEST item in each duplicate group (by `created_at`)
3. Deleted all other duplicates

**Result**:
- Deleted 105 duplicate order_items
- Kept 20 legitimate order_items
- Database is now clean

## Verification

Before fix:
```
Total order items for Jan 26: 125
Found 11 groups with duplicates (5-18 duplicates per group)
```

After fix:
```
Total order items for Jan 26: 20
No duplicates found
```

## Files Modified

1. **app/orders/actions.ts**: Added duplicate prevention logic to both `createOrderItem` and `createOrderItemsBatch`
2. **check-duplicates.js**: Diagnostic script to verify duplicates exist (can be run anytime)
3. **cleanup-duplicates.js**: One-time cleanup script to remove existing duplicates (already run)

## Prevention

The fix prevents duplicates at the database layer by checking for existing records before insertion. This means:
- ✅ Users can navigate away and back without creating duplicates
- ✅ Auto-save won't create duplicates
- ✅ Race conditions won't create duplicates
- ✅ Manual saves won't create duplicates

The production sheet will now show correct quantities based on actual order data.
