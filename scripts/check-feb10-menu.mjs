import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

dotenv.config({ path: join(projectRoot, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

const targetDate = '2026-02-10';

console.log(`=== CHECKING MENU DATA FOR ${targetDate} ===\n`);

// Check weekly_menus table
const { data: weeklyMenus } = await supabase
  .from('weekly_menus')
  .select('*')
  .lte('start_date', targetDate)
  .gte('end_date', targetDate);

console.log(`Weekly menus covering this date: ${weeklyMenus?.length || 0}`);
weeklyMenus?.forEach(wm => {
  console.log(`  Week ${wm.week_number}: ${wm.start_date} to ${wm.end_date} (ID: ${wm.id})`);
});

if (weeklyMenus && weeklyMenus.length > 0) {
  for (const wm of weeklyMenus) {
    console.log(`\n--- Menu Items for Week ${wm.week_number} ---`);

    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('*')
      .eq('weekly_menu_id', wm.id);

    console.log(`Total menu items: ${menuItems?.length || 0}`);

    // Filter for Feb 10
    const feb10Items = menuItems?.filter(item => item.day === 'tuesday' || item.date === targetDate);

    console.log(`Items for ${targetDate}: ${feb10Items?.length || 0}`);

    if (feb10Items && feb10Items.length > 0) {
      for (const item of feb10Items) {
        // Get dish details
        const { data: dish } = await supabase
          .from('dishes')
          .select('name, category')
          .eq('id', item.dish_id)
          .single();

        console.log(`  ${item.meal_type}: ${dish?.name || item.dish_id} (${dish?.category || 'unknown'})`);
      }
    }
  }
}

// Also check for any orders
console.log(`\n--- Orders for ${targetDate} ---`);
const { data: orders } = await supabase
  .from('orders')
  .select('*')
  .eq('delivery_date', targetDate);

console.log(`Found ${orders?.length || 0} orders`);
if (orders && orders.length > 0) {
  for (const order of orders) {
    const { data: dish } = await supabase
      .from('dishes')
      .select('name')
      .eq('id', order.dish_id)
      .single();

    console.log(`  ${dish?.name || order.dish_id}: ${order.quantity} portions`);
  }
}
