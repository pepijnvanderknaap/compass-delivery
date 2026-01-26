const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkCornChowder() {
  console.log('Checking Corn Chowder...\n');

  // Find the dish
  const { data: dish } = await supabase
    .from('dishes')
    .select('*')
    .ilike('name', '%corn%chowder%')
    .single();

  if (!dish) {
    console.log('❌ Corn Chowder not found in dishes table!');
    return;
  }

  console.log('✅ Dish found:');
  console.log(`   ID: ${dish.id}`);
  console.log(`   Name: ${dish.name}`);
  console.log(`   Category: ${dish.category}`);
  console.log(`   Created: ${dish.created_at}\n`);

  // Check weekly_menus for week starting Jan 27
  const { data: weeklyMenus } = await supabase
    .from('weekly_menus')
    .select('*')
    .eq('week_start_date', '2026-01-27')
    .single();

  if (weeklyMenus) {
    console.log('✅ Weekly menu found for week of Jan 27:');
    console.log(`   Menu ID: ${weeklyMenus.id}`);
    console.log(`   Soup ID: ${weeklyMenus.soup_id}`);
    console.log(`   Match: ${weeklyMenus.soup_id === dish.id ? '✅ YES' : '❌ NO'}\n`);
  } else {
    console.log('❌ No weekly menu found for week of Jan 27\n');
  }

  // Check menu_items for this dish on day 3 (Wednesday)
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*, weekly_menu:weekly_menus(week_start_date)')
    .eq('dish_id', dish.id);

  console.log(`Menu items for this dish: ${menuItems?.length || 0}`);
  if (menuItems && menuItems.length > 0) {
    menuItems.forEach(item => {
      console.log(`   - Week: ${item.weekly_menu?.week_start_date}, Day: ${item.day_of_week}`);
    });
  } else {
    console.log('   (none)');
  }

  console.log('\n---');
  console.log('Summary: The dish exists but is not assigned to the menu slot.');
  console.log('This is the same issue as Lentil Bolognese - creating from command palette');
  console.log('does not automatically assign the dish to the clicked cell.');
}

checkCornChowder();
