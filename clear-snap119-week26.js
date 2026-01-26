const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function clearSnap119Week26() {
  console.log('Clearing Snapchat 119 order items for week Jan 26-30, 2026...\n');

  // Get Snapchat 119 location ID
  const { data: location } = await supabase
    .from('locations')
    .select('id')
    .eq('name', 'SnapChat 119')
    .single();

  if (!location) {
    console.error('SnapChat 119 location not found');
    return;
  }

  console.log(`Location ID: ${location.id}`);

  // Get order ID for week starting Jan 26
  const { data: order } = await supabase
    .from('orders')
    .select('id, week_start_date')
    .eq('location_id', location.id)
    .eq('week_start_date', '2026-01-26')
    .single();

  if (!order) {
    console.log('No order found for week starting Jan 26, 2026');
    return;
  }

  console.log(`Order ID: ${order.id}`);
  console.log(`Week start date: ${order.week_start_date}`);

  // Get all order items for this week (Jan 26-30)
  const { data: items } = await supabase
    .from('order_items')
    .select('id, delivery_date, portions, meal_type, dishes(name)')
    .eq('order_id', order.id);

  console.log(`\nFound ${items?.length || 0} order items to delete:`);
  items?.forEach(item => {
    console.log(`  ${item.delivery_date} - ${item.meal_type}: ${item.dishes?.name} (${item.portions} portions)`);
  });

  // Delete all order items for this order
  const { error } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', order.id);

  if (error) {
    console.error('\nError deleting order items:', error);
  } else {
    console.log(`\n✓ Successfully deleted ${items?.length || 0} order items for SnapChat 119 week Jan 26-30`);
  }
}

clearSnap119Week26();
