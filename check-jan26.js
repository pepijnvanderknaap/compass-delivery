const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkData() {
  console.log('=== CHECKING MENU PLANNER DATA ===\n');

  const { data: weeklyMenu } = await supabase
    .from('weekly_menus')
    .select('id, week_start_date')
    .eq('week_start_date', '2026-01-19');

  console.log('Weekly menu for week starting 2026-01-19:', weeklyMenu);

  if (weeklyMenu && weeklyMenu.length > 0) {
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('day_of_week, meal_type, dishes(name)')
      .eq('menu_id', weeklyMenu[0].id)
      .eq('day_of_week', 0); // Monday

    console.log(`\nMenu items for Monday (day_of_week=0): ${menuItems?.length || 0} items`);
    menuItems?.slice(0, 5).forEach(item => {
      console.log(`  ${item.meal_type}: ${item.dishes?.name}`);
    });
  }

  console.log('\n=== CHECKING ORDER ITEMS ===\n');
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('delivery_date, portions, dishes(name), orders(locations(name))')
    .eq('delivery_date', '2026-01-26');

  console.log(`Order items for 2026-01-26: ${orderItems?.length || 0} items`);

  const byLocation = {};
  orderItems?.forEach(item => {
    const locName = item.orders?.locations?.name;
    if (locName && locName !== 'Dark Kitchen') {
      byLocation[locName] = (byLocation[locName] || 0) + 1;
    }
  });

  console.log('\nOrder items by location:');
  Object.entries(byLocation).forEach(([loc, count]) => {
    console.log(`  ${loc}: ${count} items`);
  });
}

checkData();
