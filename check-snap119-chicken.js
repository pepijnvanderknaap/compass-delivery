const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkSnap119Chicken() {
  console.log('Checking SnapChat 119 Chicken Biryani for Monday Jan 26, 2026...\n');

  // Get Snapchat 119 location ID
  const { data: location } = await supabase
    .from('locations')
    .select('id, name')
    .eq('name', 'SnapChat 119')
    .single();

  console.log(`Location: ${location.name} (ID: ${location.id})\n`);

  // Get order for week starting Jan 26
  const { data: order } = await supabase
    .from('orders')
    .select('id, week_start_date')
    .eq('location_id', location.id)
    .eq('week_start_date', '2026-01-26')
    .single();

  console.log(`Order ID: ${order.id}`);
  console.log(`Week start: ${order.week_start_date}\n`);

  // Get Chicken Biryani dish
  const { data: dish } = await supabase
    .from('dishes')
    .select('id, name, portion_size')
    .ilike('name', '%Chicken Biryani%')
    .single();

  console.log(`Dish: ${dish.name} (ID: ${dish.id})`);
  console.log(`Portion size: ${dish.portion_size}g\n`);

  // Get order items for Chicken Biryani on Jan 26
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('id, portions, delivery_date, meal_type, created_at')
    .eq('order_id', order.id)
    .eq('dish_id', dish.id)
    .eq('delivery_date', '2026-01-26');

  console.log(`Found ${orderItems?.length || 0} order_items for Chicken Biryani on Jan 26:\n`);

  if (orderItems && orderItems.length > 0) {
    orderItems.forEach(item => {
      console.log(`  ID: ${item.id}`);
      console.log(`  Portions: ${item.portions}`);
      console.log(`  Meal type: ${item.meal_type}`);
      console.log(`  Created: ${item.created_at}`);
      console.log('');
    });

    const totalPortions = orderItems.reduce((sum, item) => sum + item.portions, 0);
    console.log(`Total portions: ${totalPortions}`);
    console.log(`Expected weight: ${totalPortions * (dish.portion_size / 1000)}kg`);
  } else {
    console.log('  ❌ NO ORDER ITEMS FOUND for SnapChat 119 Chicken Biryani on Jan 26!');
  }
}

checkSnap119Chicken();
