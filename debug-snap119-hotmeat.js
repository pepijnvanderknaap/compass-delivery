const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debugSnap119HotMeat() {
  console.log('Debugging SnapChat 119 hot_meat for Monday Jan 26, 2026...\n');

  // Get Snapchat 119 location
  const { data: location } = await supabase
    .from('locations')
    .select('id, name')
    .eq('name', 'SnapChat 119')
    .single();

  console.log(`Location: ${location.name} (${location.id})\n`);

  // Get order for week starting Jan 26
  const { data: order } = await supabase
    .from('orders')
    .select('id, week_start_date')
    .eq('location_id', location.id)
    .eq('week_start_date', '2026-01-26')
    .single();

  console.log(`Order ID: ${order.id}\n`);

  // Get ALL order_items for SnapChat 119 on Jan 26 with meal_type = hot_meat
  const { data: hotMeatItems } = await supabase
    .from('order_items')
    .select('id, portions, meal_type, delivery_date, dish_id, dishes(id, name, category, portion_size), created_at')
    .eq('order_id', order.id)
    .eq('delivery_date', '2026-01-26')
    .eq('meal_type', 'hot_meat');

  console.log(`Found ${hotMeatItems?.length || 0} hot_meat order_items:\n`);

  if (hotMeatItems && hotMeatItems.length > 0) {
    let totalPortions = 0;
    hotMeatItems.forEach((item, index) => {
      console.log(`Item ${index + 1}:`);
      console.log(`  ID: ${item.id}`);
      console.log(`  Dish: ${item.dishes?.name || 'NULL'}`);
      console.log(`  Dish ID: ${item.dish_id}`);
      console.log(`  Portions: ${item.portions}`);
      console.log(`  Portion size: ${item.dishes?.portion_size || 'NULL'}g`);
      console.log(`  Weight: ${item.portions * (item.dishes?.portion_size || 0) / 1000}kg`);
      console.log(`  Created: ${item.created_at}`);
      console.log('');
      totalPortions += item.portions;
    });

    console.log(`TOTAL hot_meat portions: ${totalPortions}`);

    // Check if all items have the same dish_id
    const uniqueDishIds = new Set(hotMeatItems.map(item => item.dish_id));
    if (uniqueDishIds.size > 1) {
      console.log(`⚠️  WARNING: Multiple different dishes for hot_meat!`);
      console.log(`   Dish IDs: ${Array.from(uniqueDishIds).join(', ')}`);
    }
  } else {
    console.log('No hot_meat items found!');
  }

  // Now check what the menu says
  console.log('\n=== MENU CHECK ===\n');

  const { data: menu } = await supabase
    .from('weekly_menus')
    .select('id')
    .eq('week_start_date', '2026-01-26')
    .single();

  if (menu) {
    const { data: menuItem } = await supabase
      .from('menu_items')
      .select('meal_type, dishes(id, name, portion_size)')
      .eq('menu_id', menu.id)
      .eq('day_of_week', 0)
      .eq('meal_type', 'hot_meat')
      .single();

    if (menuItem) {
      console.log(`Menu says hot_meat = ${menuItem.dishes.name}`);
      console.log(`  Dish ID: ${menuItem.dishes.id}`);
      console.log(`  Portion size: ${menuItem.dishes.portion_size}g`);
    }
  }
}

debugSnap119HotMeat();
