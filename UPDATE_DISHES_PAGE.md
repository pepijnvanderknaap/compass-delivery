# Update Dishes Page for New Salad Categories

After running the database migration, you need to update the dishes page.

The page currently shows 6 old categories:
- Asian Salad, Mediterranean Salad, Stew Salad, Fresh Salad, Warm Salad, Other

It should show 3 new categories:
- Leafy Salads, Vegetable Salads, Coleslaws

Since the dishes page is very large, here's what needs to change:

## Location
File: `app/admin/dishes/page.tsx`
Lines: 594-930 (the entire Salad Mixes Section)

## Replace the entire Salad Mixes section with this simplified version:

The new section will show:
1. 🥗 Leafy Salads (green)
2. 🥕 Vegetable Salads (orange)  
3. 🥬 Coleslaws (purple)

Each salad will be expandable to show its components.

I'll create this update for you once you confirm the migration is complete.
