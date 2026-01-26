const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkSnap119Jan26All() {
  console.log('Checking ALL SnapChat 119 order items for Monday Jan 26, 2026...\n');

  // Get Snapchat 119 location ID
  const { data: location } = await supabase
    .from('locations')
    .select('id')
    .eq('name', 'SnapChat 119')
    .single();

  // Get order for week starting Jan 26
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('location_id', location.id)
    .eq('week_start_date', '2026-01-26')
    .single();

  console.log(`Order ID: ${order.id}\n`);

  // Get ALL order items for Jan 26
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('id, portions, delivery_date, meal_type, dishes(name, category), created_at')
    .eq('order_id', order.id)
    .eq('delivery_date', '2026-01-26')
    .order('meal_type');

  console.log(`Found ${orderItems?.length || 0} order_items for Jan 26:\n`);

  if (orderItems && orderItems.length > 0) {
    orderItems.forEach(item => {
      console.log(`  ${item.meal_type || 'null'}: ${item.dishes.name} (${item.dishes.category})`);
      console.log(`    Portions: ${item.portions}`);
      console.log(`    Created: ${item.created_at}`);
      console.log('');
    });
  } else {
    console.log('  ❌ NO ORDER ITEMS FOUND for SnapChat 119 on Jan 26!');
  }
}

checkSnap119Jan26All();
