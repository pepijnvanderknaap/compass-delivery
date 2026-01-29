const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  console.log('=== Setting up weekly menus for current 4-week cycle ===\n');

  // Calculate the current Monday and next 3 Mondays
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() + daysToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const weeks = [];
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() + (i * 7));
    const weekStartStr = weekStart.toISOString().split('T')[0];
    weeks.push({ date: weekStartStr, index: i + 1 });
  }

  console.log('Creating weekly_menus records for:');
  weeks.forEach(week => {
    console.log(`  Week ${week.index}: ${week.date}`);
  });
  console.log('');

  // Get the current user (we'll use the anon key, so created_by will be null)
  const { data: { user } } = await supabase.auth.getUser();

  for (const week of weeks) {
    // Check if week already exists
    const { data: existing } = await supabase
      .from('weekly_menus')
      .select('id')
      .eq('week_start_date', week.date)
      .maybeSingle();

    if (existing) {
      console.log(`✓ Week ${week.index} (${week.date}) already exists (ID: ${existing.id})`);
    } else {
      const { data: newMenu, error } = await supabase
        .from('weekly_menus')
        .insert({
          week_start_date: week.date,
          created_by: user?.id || null
        })
        .select()
        .single();

      if (error) {
        console.error(`✗ Error creating week ${week.index}:`, error.message);
      } else {
        console.log(`✓ Created week ${week.index} (${week.date}) with ID: ${newMenu.id}`);
      }
    }
  }

  console.log('\n✅ Weekly menus setup complete!');
  console.log('\nYou can now add dishes to any day in the menu planner.');
  console.log('The auto-save will automatically create menu_items records.\n');

  process.exit(0);
})();
