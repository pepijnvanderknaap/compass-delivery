const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  console.log('=== Checking for ALL weekly menus ===\n');

  const { data: allMenus, error: menusError } = await supabase
    .from('weekly_menus')
    .select('*')
    .order('week_start_date', { ascending: false });

  if (menusError) {
    console.error('Error fetching menus:', menusError);
    return;
  }

  console.log('Total weekly_menus records:', allMenus.length);
  console.log('\nAll weeks with menus:');
  allMenus.forEach(menu => {
    console.log('  Week starting:', menu.week_start_date, '(ID:', menu.id + ')');
  });

  // Now check menu_items for each week
  console.log('\n=== Checking menu_items for each week ===\n');
  for (const menu of allMenus) {
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('*, dishes(name)')
      .eq('menu_id', menu.id)
      .order('day_of_week');

    if (!itemsError && items && items.length > 0) {
      console.log('Week starting', menu.week_start_date + ':');
      items.forEach(item => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        console.log('  -', days[item.day_of_week], '(' + item.meal_type + '):', item.dishes?.name || 'Unknown dish');
      });
      console.log('');
    }
  }

  process.exit(0);
})();
