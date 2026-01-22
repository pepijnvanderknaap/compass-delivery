const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanupDuplicates() {
  console.log('Starting duplicate cleanup...\n');

  // Get all order items for Jan 26, 2026 (the problematic date)
  const { data: orderItems, error } = await supabase
    .from('order_items')
    .select('id, order_id, dish_id, delivery_date, meal_type, portions, created_at')
    .eq('delivery_date', '2026-01-26')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching order items:', error);
    return;
  }

  console.log(`Found ${orderItems?.length} total order items for Jan 26, 2026\n`);

  // Group by unique key (order_id + dish_id + delivery_date + meal_type)
  const groups = {};
  orderItems?.forEach(item => {
    const key = `${item.order_id}-${item.dish_id}-${item.delivery_date}-${item.meal_type || 'null'}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  });

  // Find duplicates
  const duplicateGroups = Object.entries(groups).filter(([_, items]) => items.length > 1);

  console.log(`Found ${duplicateGroups.length} groups with duplicates\n`);

  if (duplicateGroups.length === 0) {
    console.log('No duplicates to clean up!');
    return;
  }

  let totalDeleted = 0;

  // For each duplicate group, keep the first (oldest) and delete the rest
  for (const [key, items] of duplicateGroups) {
    const [orderId, dishId, deliveryDate, mealType] = key.split('-');

    // Keep the first item (oldest by created_at - already sorted)
    const itemToKeep = items[0];
    const itemsToDelete = items.slice(1);

    console.log(`Group: ${key}`);
    console.log(`  Total duplicates: ${items.length}`);
    console.log(`  Keeping: ${itemToKeep.id.substring(0, 8)} (created: ${itemToKeep.created_at}, portions: ${itemToKeep.portions})`);
    console.log(`  Deleting ${itemsToDelete.length} duplicates:`);

    // Delete all duplicates
    const idsToDelete = itemsToDelete.map(item => item.id);

    for (const item of itemsToDelete) {
      console.log(`    - ${item.id.substring(0, 8)} (created: ${item.created_at}, portions: ${item.portions})`);
    }

    const { error: deleteError } = await supabase
      .from('order_items')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error(`  ERROR deleting duplicates:`, deleteError);
    } else {
      console.log(`  ✓ Successfully deleted ${idsToDelete.length} duplicates\n`);
      totalDeleted += idsToDelete.length;
    }
  }

  console.log(`\n=== CLEANUP COMPLETE ===`);
  console.log(`Total items deleted: ${totalDeleted}`);
  console.log(`Remaining items: ${orderItems.length - totalDeleted}`);
}

cleanupDuplicates();
