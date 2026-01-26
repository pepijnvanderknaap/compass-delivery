const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkMenu() {
  const { data: menu } = await supabase
    .from('weekly_menus')
    .select('*')
    .eq('week_start_date', '2026-01-26')
    .single();

  console.log('Menu for week starting Jan 26:', menu);

  if (menu) {
    const { data: items } = await supabase
      .from('menu_items')
      .select('meal_type, dishes(name, category, id)')
      .eq('menu_id', menu.id)
      .eq('day_of_week', 0);

    console.log('\nMonday Jan 26 menu items:');
    items?.forEach(item => {
      console.log('  ' + item.meal_type + ':', item.dishes?.name, '(ID:', item.dishes?.id + ')');
    });
  }
}

checkMenu();
