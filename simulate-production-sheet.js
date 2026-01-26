const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function simulateProductionSheet() {
  console.log('Simulating production sheet for Monday Jan 26, 2026...\n');

  // Get the menu for week starting Jan 26
  const { data: menu } = await supabase
    .from('weekly_menus')
    .select('id')
    .eq('week_start_date', '2026-01-26')
    .single();

  // Get menu items for Monday (day_of_week = 0)
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('meal_type, dishes(id, name, portion_size)')
    .eq('menu_id', menu.id)
    .eq('day_of_week', 0);

  console.log('=== MENU FOR MONDAY JAN 26 ===\n');
  menuItems?.forEach(item => {
    console.log(`${item.meal_type}: ${item.dishes.name} (${item.dishes.portion_size}g)`);
  });

  // Get ALL order_items for Jan 26
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('meal_type, portions, dish_id, dishes(name), orders(location_id, locations(name))')
    .eq('delivery_date', '2026-01-26');

  console.log('\n=== PRODUCTION SHEET SIMULATION ===\n');

  // For each menu item (this is how the production sheet works)
  for (const menuItem of menuItems || []) {
    const mealType = menuItem.meal_type;
    const menuDish = menuItem.dishes;

    console.log(`\n--- ${menuDish.name} (${mealType}) ---`);
    console.log(`Portion size: ${menuDish.portion_size}g\n`);

    // Filter order_items by meal_type (THIS IS THE BUG!)
    const relevantItems = orderItems?.filter(item => item.meal_type === mealType) || [];

    // Group by location
    const byLocation = {};
    let totalPortions = 0;

    relevantItems.forEach(item => {
      const locName = item.orders.locations.name;
      if (!byLocation[locName]) {
        byLocation[locName] = 0;
      }
      byLocation[locName] += item.portions;
      totalPortions += item.portions;
    });

    // Display location breakdown
    Object.entries(byLocation).forEach(([locName, portions]) => {
      const weight = portions * menuDish.portion_size / 1000;
      console.log(`  ${locName}: ${portions} portions × ${menuDish.portion_size}g = ${weight}kg`);
    });

    const totalWeight = totalPortions * menuDish.portion_size / 1000;
    console.log(`\n  TOTAL: ${totalPortions} portions × ${menuDish.portion_size}g = ${totalWeight}kg`);

    // Show what dishes were actually ordered
    const dishesOrdered = {};
    relevantItems.forEach(item => {
      const dishName = item.dishes.name;
      if (!dishesOrdered[dishName]) {
        dishesOrdered[dishName] = 0;
      }
      dishesOrdered[dishName] += item.portions;
    });

    console.log(`\n  Actual dishes ordered:`);
    Object.entries(dishesOrdered).forEach(([dishName, portions]) => {
      const isMenu = dishName === menuDish.name ? '✓ MENU' : '⚠️  OFF-MENU';
      console.log(`    ${dishName}: ${portions} portions ${isMenu}`);
    });
  }
}

simulateProductionSheet();
