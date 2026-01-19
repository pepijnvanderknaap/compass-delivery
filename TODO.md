# TODO - Compass Delivery

## Performance Issues

### Slow Order Save
**Priority:** Medium
**Status:** Known Issue
**Location:** `app/orders/page.tsx` - handleSave function

**Problem:**
- Saving order edits is slow because it processes each field sequentially
- Currently: ~20 sequential database operations (one per field)
- Takes several seconds to complete

**Attempted Solutions:**
- Tried batch inserts for new items ✅ Works
- Tried parallel updates with Promise.all ❌ Shows old values after save
- Issue: Race condition between database writes and fetch refresh

**Solution Needed:**
- Investigate why parallel updates cause stale data to display
- Possible approaches:
  1. Add proper transaction support
  2. Use optimistic updates in UI
  3. Ensure database changes are fully committed before refresh
  4. Debug the timing issue with parallel Promise.all

**Code Location:**
- Server action: `app/orders/actions.ts` - createOrderItemsBatch()
- Client code: `app/orders/page.tsx:175-262` - handleSave()

---

## Future Enhancements

### Order History Tracking
**Priority:** Low
**Status:** Idea
**Requested By:** User

**Description:**
Create a database field to store order history for each location, allowing tracking of changes over time.

---

## Completed Items

- ✅ Fixed RLS policy blocking order item creation
- ✅ Added service role key for bypassing RLS after permission checks
- ✅ Created HoverNumberInput component with +/- buttons
- ✅ Fixed number input state synchronization
- ✅ Added admin role support to order item creation
- ✅ Order editing now works correctly (saves persist)
