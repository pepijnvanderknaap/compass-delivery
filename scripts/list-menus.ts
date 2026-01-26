import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listMenus() {
  console.log('=== All Menus in Database ===\n');

  const { data: menus } = await supabase
    .from('menus')
    .select('*')
    .order('start_date', { ascending: true });

  if (!menus || menus.length === 0) {
    console.log('❌ No menus found in database');
    return;
  }

  console.log(`Found ${menus.length} menu(s):\n`);
  menus.forEach(menu => {
    const startDate = new Date(menu.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // Add 6 days to get end of week

    console.log(`Week ${menu.week_number}:`);
    console.log(`  Start: ${startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
    console.log(`  End: ${endDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
    console.log(`  ID: ${menu.id}`);
    console.log('');
  });

  console.log('=== Checking for January 29, 2026 ===');
  console.log('January 29, 2026 is a Thursday');
  console.log('It should be in the week starting Monday, January 26, 2026');
  console.log('');

  const jan26Menu = menus.find(m => m.start_date === '2026-01-26');
  if (jan26Menu) {
    console.log('✅ Menu found for that week!');
  } else {
    console.log('❌ No menu found for week of Jan 26, 2026');
    console.log('');
    console.log('Closest menus:');
    const sortedMenus = menus.sort((a, b) =>
      Math.abs(new Date('2026-01-26').getTime() - new Date(a.start_date).getTime()) -
      Math.abs(new Date('2026-01-26').getTime() - new Date(b.start_date).getTime())
    );
    sortedMenus.slice(0, 3).forEach(menu => {
      console.log(`  - ${menu.start_date} (Week ${menu.week_number})`);
    });
  }
}

listMenus().catch(console.error);
