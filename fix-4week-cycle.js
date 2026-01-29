const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== Fixing 4-Week Cycle Copies ===\n');

  const copies = [
    { from: '2026-01-19', to: '2026-02-16', label: 'Week 1 → Week 5' },
    { from: '2026-01-26', to: '2026-02-23', label: 'Week 2 → Week 6' },
    { from: '2026-02-02', to: '2026-03-02', label: 'Week 3 → Week 7' },
    { from: '2026-02-09', to: '2026-03-09', label: 'Week 4 → Week 8' },
  ];

  for (const { from, to, label } of copies) {
    console.log(`\n${label}:`);

    // Get source menu and its items
    const { data: sourceMenu, error: sourceError } = await supabase
      .from('weekly_menus')
      .select('id, week_start_date, menu_items(*)')
      .eq('week_start_date', from)
      .single();

    if (sourceError || !sourceMenu) {
      console.log(`  ❌ Source menu not found`);
      continue;
    }

    if (!sourceMenu.menu_items || sourceMenu.menu_items.length === 0) {
      console.log(`  ⚠️  Source menu has no items to copy`);
      continue;
    }

    console.log(`  ✓ Found source with ${sourceMenu.menu_items.length} items`);

    // Check if target menu exists
    let { data: targetMenu } = await supabase
      .from('weekly_menus')
      .select('id')
      .eq('week_start_date', to)
      .maybeSingle();

    // Create target menu if it doesn't exist
    if (!targetMenu) {
      console.log(`  → Creating target weekly_menu...`);
      const { data: newMenu, error: createError } = await supabase
        .from('weekly_menus')
        .insert({ week_start_date: to, created_by: null })
        .select()
        .single();

      if (createError) {
        console.log(`  ❌ Error creating menu: ${createError.message}`);
        continue;
      }

      targetMenu = newMenu;
      console.log(`  ✓ Created menu (ID: ${targetMenu.id})`);
    } else {
      console.log(`  ✓ Target menu exists (ID: ${targetMenu.id})`);
    }

    // Check if target already has items
    const { data: existingItems } = await supabase
      .from('menu_items')
      .select('id')
      .eq('menu_id', targetMenu.id);

    if (existingItems && existingItems.length > 0) {
      console.log(`  ⚠️  Target already has ${existingItems.length} items, skipping copy`);
      continue;
    }

    // Copy menu items
    const itemsToCopy = sourceMenu.menu_items.map((item) => ({
      menu_id: targetMenu.id,
      dish_id: item.dish_id,
      day_of_week: item.day_of_week,
      meal_type: item.meal_type,
    }));

    const { error: copyError } = await supabase
      .from('menu_items')
      .insert(itemsToCopy);

    if (copyError) {
      console.log(`  ❌ Error copying items: ${copyError.message}`);
    } else {
      console.log(`  ✅ Copied ${itemsToCopy.length} menu items successfully`);
    }
  }

  console.log('\n\n✅ 4-week cycle fix complete!\n');
  process.exit(0);
})();
