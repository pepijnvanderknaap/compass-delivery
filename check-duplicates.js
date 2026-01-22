const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkDuplicates() {
  // Check for duplicate order items on Jan 26, 2026
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('id, order_id, dish_id, delivery_date, portions, meal_type, orders(location_id, locations(name))')
    .eq('delivery_date', '2026-01-26')
    .order('meal_type')
    .order('portions');

  console.log(`\nTotal order items for Jan 26: ${orderItems?.length}\n`);

  // Group by order_id + dish_id + meal_type to find duplicates
  const groups = {};
  orderItems?.forEach(item => {
    const key = `${item.order_id}-${item.dish_id}-${item.meal_type}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  });

  // Show duplicates
  console.log('DUPLICATES FOUND:\n');
  Object.entries(groups).forEach(([key, items]) => {
    if (items.length > 1) {
      const location = items[0].orders?.locations?.name || 'Unknown';
      console.log(`Location: ${location}`);
      console.log(`  Meal type: ${items[0].meal_type}`);
      console.log(`  Count: ${items.length} duplicate entries`);
      console.log(`  IDs: ${items.map(i => i.id.substring(0, 8)).join(', ')}`);
      console.log(`  Portions: ${items.map(i => i.portions).join(', ')}`);
      console.log('');
    }
  });
}

checkDuplicates();
