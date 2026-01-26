const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debugProductionCalc() {
  console.log('Debug production calculation for SnapChat 119 Monday Jan 26...\n');

  // Get SnapChat 119 location
  const { data: location } = await supabase
    .from('locations')
    .select('id, name')
    .eq('name', 'SnapChat 119')
    .single();

  console.log(`Location: ${location.name} (${location.id})\n`);

  // Get ALL order_items for SnapChat 119 on Jan 26
  const { data: allItems } = await supabase
    .from('order_items')
    .select('meal_type, portions, dish_id, dishes(name, portion_size), orders(location_id)')
    .eq('delivery_date', '2026-01-26')
    .eq('orders.location_id', location.id);

  console.log('Order items for SnapChat 119:\n');
  allItems?.forEach(item => {
    console.log(`  ${item.meal_type}: ${item.portions} × ${item.dishes.name} (${item.dishes.portion_size}g) = ${item.portions * (item.dishes.portion_size || 0) / 1000}kg`);
  });

  // Now simulate what production sheet does
  console.log('\n=== PRODUCTION SHEET SIMULATION ===\n');

  // Get menu
  const { data: menu } = await supabase
    .from('weekly_menus')
    .select('id')
    .eq('week_start_date', '2026-01-26')
    .single();

  // Get menu items for Monday
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('meal_type, dishes(id, name, portion_size)')
    .eq('menu_id', menu.id)
    .eq('day_of_week', 0);

  // For Chicken Biryani
  const chickenBiryani = menuItems?.find(item => item.meal_type === 'hot_meat');
  console.log(`Menu dish for hot_meat: ${chickenBiryani.dishes.name} (${chickenBiryani.dishes.portion_size}g)`);

  // Get all order_items with meal_type = hot_meat on Jan 26
  const { data: hotMeatItems } = await supabase
    .from('order_items')
    .select('portions, orders(location_id, locations(name))')
    .eq('delivery_date', '2026-01-26')
    .eq('meal_type', 'hot_meat');

  console.log('\nAll hot_meat order_items on Jan 26:');
  const snap119HotMeat = hotMeatItems?.filter(item => item.orders.location_id === location.id) || [];

  snap119HotMeat.forEach(item => {
    console.log(`  ${item.orders.locations.name}: ${item.portions} portions`);
  });

  const totalPortions = snap119HotMeat.reduce((sum, item) => sum + item.portions, 0);
  const calculatedWeight = totalPortions * chickenBiryani.dishes.portion_size / 1000;

  console.log(`\nCalculation:`);
  console.log(`  Total portions: ${totalPortions}`);
  console.log(`  × Portion size: ${chickenBiryani.dishes.portion_size}g`);
  console.log(`  = ${calculatedWeight}kg`);

  // Check if 22.8kg could be explained
  console.log(`\nTo get 22.8kg:`);
  console.log(`  22.8kg ÷ 320g = ${22.8 * 1000 / 320} portions`);
  console.log(`  That's ${22.8 * 1000 / 320 - 65} extra portions`);

  // Check if it's combining hot_meat AND hot_veg
  console.log(`\nChecking if hot_veg is being added:`);
  const hotVegItems = allItems?.filter(item => item.meal_type === 'hot_veg') || [];
  hotVegItems.forEach(item => {
    console.log(`  hot_veg: ${item.portions} portions of ${item.dishes.name}`);
  });

  const vegPortions = hotVegItems.reduce((sum, item) => sum + item.portions, 0);
  console.log(`\nIf we add hot_meat (65) + hot_veg (${vegPortions}) = ${totalPortions + vegPortions} portions`);
  console.log(`  ${totalPortions + vegPortions} × 320g = ${(totalPortions + vegPortions) * 320 / 1000}kg`);
}

debugProductionCalc();
