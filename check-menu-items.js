const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkMenuItems() {
  console.log('Checking for menu items with Lentil Bolognese...\n');

  // The IDs we deleted
  const deletedIds = [
    'ec0573f7-08c6-435b-8ad0-5dea8bffd509',
    '9f9441a6-dec5-4c1d-8055-37acd1327560',
    '59e93f93-21f5-4908-87a7-e6d82307b166'
  ];

  const validId = '0883081f-f42f-4f92-b864-c28808a5b424';

  // Check weekly_menus table for references
  const { data: weeklyMenus } = await supabase
    .from('weekly_menus')
    .select('*')
    .or(`hot_dish_veg_id.in.(${[...deletedIds, validId].join(',')})`);

  if (weeklyMenus && weeklyMenus.length > 0) {
    console.log('Found in weekly_menus:');
    weeklyMenus.forEach(menu => {
      const isDeleted = deletedIds.includes(menu.hot_dish_veg_id);
      console.log(`   Week: ${menu.week_start_date}`);
      console.log(`   Dish ID: ${menu.hot_dish_veg_id} ${isDeleted ? '❌ DELETED' : '✅ VALID'}`);

      if (isDeleted) {
        console.log(`   → Should update to: ${validId}\n`);
      }
    });

    // Fix any references to deleted IDs
    const menusToFix = weeklyMenus.filter(m => deletedIds.includes(m.hot_dish_veg_id));

    if (menusToFix.length > 0) {
      console.log(`\nFixing ${menusToFix.length} menu reference(s)...`);

      for (const menu of menusToFix) {
        const { error } = await supabase
          .from('weekly_menus')
          .update({ hot_dish_veg_id: validId })
          .eq('id', menu.id);

        if (error) {
          console.error(`❌ Failed to update menu ${menu.id}:`, error.message);
        } else {
          console.log(`✅ Updated menu for week ${menu.week_start_date}`);
        }
      }
    }
  } else {
    console.log('No menu items found with Lentil Bolognese');
  }

  // Check menu_items table too
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*')
    .in('dish_id', [...deletedIds, validId]);

  if (menuItems && menuItems.length > 0) {
    console.log('\nFound in menu_items:');
    menuItems.forEach(item => {
      const isDeleted = deletedIds.includes(item.dish_id);
      console.log(`   Menu Item ID: ${item.id}`);
      console.log(`   Dish ID: ${item.dish_id} ${isDeleted ? '❌ DELETED' : '✅ VALID'}`);
    });

    const itemsToFix = menuItems.filter(item => deletedIds.includes(item.dish_id));

    if (itemsToFix.length > 0) {
      console.log(`\nFixing ${itemsToFix.length} menu item reference(s)...`);

      for (const item of itemsToFix) {
        const { error } = await supabase
          .from('menu_items')
          .update({ dish_id: validId })
          .eq('id', item.id);

        if (error) {
          console.error(`❌ Failed to update menu item ${item.id}:`, error.message);
        } else {
          console.log(`✅ Updated menu item ${item.id}`);
        }
      }
    }
  }

  console.log('\n✅ Done!');
}

checkMenuItems();
