const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkMenuJan26() {
  console.log('Checking menu for Monday Jan 26, 2026...\n');

  // Get week starting Jan 26
  const { data: menu } = await supabase
    .from('weekly_menus')
    .select('id, week_start_date')
    .eq('week_start_date', '2026-01-26')
    .single();

  if (!menu) {
    console.log('No menu found for week starting Jan 26, 2026');
    return;
  }

  console.log(`Menu ID: ${menu.id}`);
  console.log(`Week start: ${menu.week_start_date}\n`);

  // Get menu items for Monday (day_of_week = 0)
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('meal_type, day_of_week, dishes(id, name, category, portion_size)')
    .eq('menu_id', menu.id)
    .eq('day_of_week', 0)
    .order('meal_type');

  console.log('Menu items for Monday Jan 26:\n');
  menuItems?.forEach(item => {
    console.log(`  ${item.meal_type}:`);
    console.log(`    Dish: ${item.dishes.name}`);
    console.log(`    Category: ${item.dishes.category}`);
    console.log(`    Portion size: ${item.dishes.portion_size}g`);
    console.log(`    Dish ID: ${item.dishes.id}`);
    console.log('');
  });

  // Now check ALL order_items for Monday Jan 26
  const { data: allOrderItems } = await supabase
    .from('order_items')
    .select('id, portions, meal_type, dishes(id, name, category), orders(locations(name))')
    .eq('delivery_date', '2026-01-26')
    .order('meal_type');

  console.log('ALL order_items for Monday Jan 26:\n');

  const byMealType = {};
  allOrderItems?.forEach(item => {
    if (!byMealType[item.meal_type]) {
      byMealType[item.meal_type] = [];
    }
    byMealType[item.meal_type].push(item);
  });

  Object.entries(byMealType).forEach(([mealType, items]) => {
    console.log(`${mealType}:`);
    items.forEach(item => {
      console.log(`  ${item.orders.locations.name}: ${item.portions} portions of ${item.dishes.name}`);
    });
    const total = items.reduce((sum, item) => sum + item.portions, 0);
    console.log(`  TOTAL: ${total} portions`);
    console.log('');
  });

  // Find what menu says vs what was ordered
  console.log('\n=== DISCREPANCY ANALYSIS ===\n');
  menuItems?.forEach(menuItem => {
    const orderedItems = byMealType[menuItem.meal_type] || [];
    const menuDishId = menuItem.dishes.id;
    const menuDishName = menuItem.dishes.name;

    console.log(`Menu says ${menuItem.meal_type} = ${menuDishName}`);

    const matchingOrders = orderedItems.filter(item => item.dishes.id === menuDishId);
    const nonMatchingOrders = orderedItems.filter(item => item.dishes.id !== menuDishId);

    if (matchingOrders.length > 0) {
      const matchingTotal = matchingOrders.reduce((sum, item) => sum + item.portions, 0);
      console.log(`  ✓ Matching orders: ${matchingTotal} portions`);
    }

    if (nonMatchingOrders.length > 0) {
      console.log(`  ⚠️  Non-matching orders:`);
      nonMatchingOrders.forEach(item => {
        console.log(`    ${item.orders.locations.name}: ${item.portions} portions of ${item.dishes.name}`);
      });
      const nonMatchingTotal = nonMatchingOrders.reduce((sum, item) => sum + item.portions, 0);
      console.log(`  ⚠️  Total non-matching: ${nonMatchingTotal} portions`);
    }

    const allTotal = orderedItems.reduce((sum, item) => sum + item.portions, 0);
    const portionSize = menuItem.dishes.portion_size;
    console.log(`  Production sheet will show: ${menuDishName} - ${allTotal} portions × ${portionSize}g = ${allTotal * portionSize / 1000}kg`);
    console.log('');
  });
}

checkMenuJan26();
