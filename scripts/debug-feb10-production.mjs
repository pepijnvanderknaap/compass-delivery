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

console.log('=== DEBUGGING FEB 10 PRODUCTION DATA ===\n');

// 1. Check weekly menus
const { data: weeklyMenus } = await supabase
  .from('weekly_menus')
  .select('*')
  .lte('start_date', targetDate)
  .gte('end_date', targetDate);

console.log(`1. Weekly Menus: ${weeklyMenus?.length || 0}`);
if (weeklyMenus && weeklyMenus.length > 0) {
  weeklyMenus.forEach(wm => {
    console.log(`   Week ${wm.week_number}: ${wm.start_date} to ${wm.end_date}`);
  });
}

// 2. Check menu items
let menuItems = [];
if (weeklyMenus && weeklyMenus.length > 0) {
  for (const wm of weeklyMenus) {
    const { data: items } = await supabase
      .from('menu_items')
      .select('*')
      .eq('weekly_menu_id', wm.id);

    if (items) {
      menuItems = menuItems.concat(items);
    }
  }
}
console.log(`\n2. Total Menu Items: ${menuItems.length}`);

// 3. Check orders
const { data: orders } = await supabase
  .from('orders')
  .select('*')
  .eq('delivery_date', targetDate);

console.log(`\n3. Orders for ${targetDate}: ${orders?.length || 0}`);
if (orders && orders.length > 0) {
  for (const order of orders) {
    const { data: dish } = await supabase
      .from('dishes')
      .select('name, category, default_portion_size_ml, default_portion_size_g')
      .eq('id', order.dish_id)
      .single();

    console.log(`   Order ${order.id}:`);
    console.log(`     Dish: ${dish?.name || 'Unknown'} (${dish?.category})`);
    console.log(`     Quantity: ${order.quantity} portions`);
    console.log(`     Portion size: ${dish?.default_portion_size_ml ? dish.default_portion_size_ml + 'ml' : dish?.default_portion_size_g ? dish.default_portion_size_g + 'g' : 'NOT SET'}`);

    if (dish?.default_portion_size_ml) {
      const totalMl = order.quantity * dish.default_portion_size_ml;
      console.log(`     Total: ${(totalMl / 1000).toFixed(2)} liters`);
    } else if (dish?.default_portion_size_g) {
      const totalG = order.quantity * dish.default_portion_size_g;
      console.log(`     Total: ${(totalG / 1000).toFixed(2)} kg`);
    }
  }
}

// 4. Check Cauliflower Soup dish details
console.log('\n4. Cauliflower Soup Dish Details:');
const { data: caulfDish } = await supabase
  .from('dishes')
  .select('*')
  .eq('name', 'Cauliflower Soup')
  .single();

if (caulfDish) {
  console.log(`   ID: ${caulfDish.id}`);
  console.log(`   Name: ${caulfDish.name}`);
  console.log(`   Category: ${caulfDish.category}`);
  console.log(`   default_portion_size_ml: ${caulfDish.default_portion_size_ml || 'NULL'}`);
  console.log(`   default_portion_size_g: ${caulfDish.default_portion_size_g || 'NULL'}`);
  console.log(`   portion_size: ${caulfDish.portion_size || 'NULL'}`);
}

// 5. Check if there's a recipe linked
const { data: caulfRecipe } = await supabase
  .from('recipes')
  .select('*')
  .eq('name', 'Cauliflower Soup')
  .single();

if (caulfRecipe) {
  console.log('\n5. Cauliflower Soup Recipe:');
  console.log(`   ID: ${caulfRecipe.id}`);
  console.log(`   dish_id: ${caulfRecipe.dish_id || 'NULL'}`);
  console.log(`   base_quantity: ${caulfRecipe.base_quantity}`);
  console.log(`   base_unit: ${caulfRecipe.base_unit}`);
  console.log(`   Linked to dish: ${caulfRecipe.dish_id === caulfDish?.id ? 'YES ✅' : 'NO ❌'}`);
}

console.log('\n=== SUMMARY ===');
console.log(`Menu items exist: ${menuItems.length > 0 ? 'YES' : 'NO'}`);
console.log(`Orders exist: ${orders && orders.length > 0 ? 'YES' : 'NO'}`);
console.log(`Recipe linked: ${caulfRecipe?.dish_id === caulfDish?.id ? 'YES' : 'NO'}`);
console.log(`Portion size set: ${caulfDish?.default_portion_size_ml || caulfDish?.default_portion_size_g ? 'YES' : 'NO'}`);
