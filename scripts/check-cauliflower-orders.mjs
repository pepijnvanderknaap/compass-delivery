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

console.log('=== CAULIFLOWER SOUP ORDERS CHECK ===\n');

// Get the Cauliflower Soup dish
const { data: dish } = await supabase
  .from('dishes')
  .select('*')
  .eq('name', 'Cauliflower Soup')
  .single();

if (!dish) {
  console.log('❌ Cauliflower Soup dish not found');
  process.exit(1);
}

console.log(`Dish: ${dish.name}`);
console.log(`  ID: ${dish.id}`);
console.log(`  Category: ${dish.category}`);
console.log(`  Portion size: ${dish.portion_size_g}g\n`);

// Get the recipe
const { data: recipe } = await supabase
  .from('recipes')
  .select('*')
  .eq('dish_id', dish.id)
  .single();

if (recipe) {
  console.log(`Recipe: ${recipe.name}`);
  console.log(`  ID: ${recipe.id}`);
  console.log(`  dish_id: ${recipe.dish_id} ✅`);
  console.log(`  Base quantity: ${recipe.base_quantity} ${recipe.base_unit}\n`);
} else {
  console.log('❌ No recipe linked to this dish\n');
}

// Find all orders for this dish
const { data: orders } = await supabase
  .from('orders')
  .select('*')
  .eq('dish_id', dish.id)
  .order('delivery_date');

console.log(`=== ORDERS FOR CAULIFLOWER SOUP ===\n`);
console.log(`Found ${orders?.length || 0} orders:\n`);

if (orders && orders.length > 0) {
  const byDate = {};
  orders.forEach(o => {
    if (!byDate[o.delivery_date]) {
      byDate[o.delivery_date] = { count: 0, totalQty: 0 };
    }
    byDate[o.delivery_date].count += 1;
    byDate[o.delivery_date].totalQty += o.quantity || 0;
  });

  Object.keys(byDate).sort().forEach(date => {
    const info = byDate[date];
    console.log(`${date}: ${info.count} orders, ${info.totalQty} total portions`);
  });
} else {
  console.log('No orders found for this dish');
}
