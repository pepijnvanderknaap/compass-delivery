import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSaladPortions() {
  // Get the menu for the week of Jan 27, 2026
  const weekStart = '2026-01-26'; // Monday of that week

  const { data: menu } = await supabase
    .from('weekly_menus')
    .select('id')
    .eq('week_start_date', weekStart)
    .single();

  if (!menu) {
    console.log('No menu found for week starting', weekStart);
    return;
  }

  // Tuesday = day_of_week 1 (Monday is 0)
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('dish_id, meal_type')
    .eq('menu_id', menu.id)
    .eq('day_of_week', 1); // Tuesday

  console.log('\nMenu items for Tuesday Jan 27:');

  for (const item of menuItems || []) {
    const { data: dish } = await supabase
      .from('dishes')
      .select('id, name, category, salad_total_portion_g')
      .eq('id', item.dish_id)
      .single();

    console.log(`\n${item.meal_type}: ${dish.name}`);
    console.log(`  Salad Total Portion: ${dish.salad_total_portion_g || 'NOT SET'} grams`);
  }
}

checkSaladPortions();
