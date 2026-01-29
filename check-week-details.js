const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  console.log('=== Detailed Week Analysis ===\n');

  const weeks = [
    '2026-01-19', // Week 1
    '2026-01-26', // Week 2
    '2026-02-02', // Week 3
    '2026-02-09', // Week 4
    '2026-02-16', // Week 5 (should be copy of week 1)
    '2026-02-23', // Week 6 (should be copy of week 2)
    '2026-03-02', // Week 7 (should be copy of week 3)
    '2026-03-09', // Week 8 (should be copy of week 4)
  ];

  for (const weekStart of weeks) {
    console.log(`\nWeek starting ${weekStart}:`);

    // Check if weekly_menu exists
    const { data: menu } = await supabase
      .from('weekly_menus')
      .select('id')
      .eq('week_start_date', weekStart)
      .maybeSingle();

    if (!menu) {
      console.log('  ❌ No weekly_menu record');
      continue;
    }

    console.log(`  ✓ weekly_menu exists (ID: ${menu.id})`);

    // Check menu_items
    const { data: items } = await supabase
      .from('menu_items')
      .select('day_of_week, meal_type, dishes(name)')
      .eq('menu_id', menu.id)
      .order('day_of_week');

    if (!items || items.length === 0) {
      console.log('  ❌ No menu_items (empty week)');
    } else {
      console.log(`  ✓ Has ${items.length} menu items:`);
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      items.forEach(item => {
        console.log(`    - ${days[item.day_of_week]} ${item.meal_type}: ${item.dishes?.name || 'Unknown'}`);
      });
    }
  }

  // Check the copy logic
  console.log('\n\n=== 4-Week Copy Analysis ===\n');
  console.log('Week 1 (Jan 19) should copy to Week 5 (Feb 16)');
  console.log('Week 2 (Jan 26) should copy to Week 6 (Feb 23)');
  console.log('Week 3 (Feb 2) should copy to Week 7 (Mar 2)');
  console.log('Week 4 (Feb 9) should copy to Week 8 (Mar 9)');

  process.exit(0);
})();
