const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function analyzeChickenBiryani() {
  console.log('Analyzing Chicken Biryani for Monday Jan 26, 2026...\n');

  // Get Chicken Biryani dish details
  const { data: dish } = await supabase
    .from('dishes')
    .select('id, name, portion_size, portion_unit')
    .ilike('name', '%Chicken Biryani%')
    .single();

  console.log('Chicken Biryani dish:');
  console.log(`  ID: ${dish.id}`);
  console.log(`  Name: ${dish.name}`);
  console.log(`  Portion size: ${dish.portion_size} ${dish.portion_unit}\n`);

  // Get all order_items for Chicken Biryani on Jan 26
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('id, portions, delivery_date, meal_type, orders(location_id, locations(name))')
    .eq('dish_id', dish.id)
    .eq('delivery_date', '2026-01-26');

  console.log(`Found ${orderItems?.length} order_items for Chicken Biryani on Jan 26:\n`);

  let totalPortions = 0;
  orderItems?.forEach(item => {
    const location = item.orders?.locations?.name || 'Unknown';
    console.log(`  ${location}: ${item.portions} portions (meal_type: ${item.meal_type})`);
    totalPortions += item.portions;
  });

  console.log(`\nTotal portions: ${totalPortions}`);
  console.log(`Expected weight: ${totalPortions * (dish.portion_size / 1000)}kg`);
  console.log(`Displayed weight: 22.8kg`);
  console.log(`Difference: ${22.8 - (totalPortions * (dish.portion_size / 1000))}kg\n`);

  // Check menu for Jan 26
  const { data: menu } = await supabase
    .from('weekly_menus')
    .select('id')
    .eq('week_start_date', '2026-01-26')
    .single();

  if (menu) {
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('meal_type, dishes(name)')
      .eq('menu_id', menu.id)
      .eq('day_of_week', 0);

    console.log('Menu for Monday Jan 26:');
    menuItems?.forEach(item => {
      console.log(`  ${item.meal_type}: ${item.dishes?.name}`);
    });
  }
}

analyzeChickenBiryani();
