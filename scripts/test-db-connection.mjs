import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

dotenv.config({ path: join(projectRoot, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== DATABASE CONNECTION TEST ===\n');
console.log('Supabase URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET');
console.log('Supabase Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET');

const supabase = createClient(supabaseUrl, supabaseKey);

// Test 1: Check orders
console.log('\n--- Testing orders table ---');
const { data: orders, error: ordersError, count: ordersCount } = await supabase
  .from('orders')
  .select('*', { count: 'exact', head: true });

if (ordersError) {
  console.error('Error:', ordersError);
} else {
  console.log(`✅ Orders table accessible. Count: ${ordersCount}`);
}

// Test 2: Check dishes
console.log('\n--- Testing dishes table ---');
const { data: dishes, error: dishesError, count: dishesCount } = await supabase
  .from('dishes')
  .select('*', { count: 'exact', head: true });

if (dishesError) {
  console.error('Error:', dishesError);
} else {
  console.log(`✅ Dishes table accessible. Count: ${dishesCount}`);
}

// Test 3: Check recipes
console.log('\n--- Testing recipes table ---');
const { data: recipes, error: recipesError, count: recipesCount } = await supabase
  .from('recipes')
  .select('*', { count: 'exact', head: true });

if (recipesError) {
  console.error('Error:', recipesError);
} else {
  console.log(`✅ Recipes table accessible. Count: ${recipesCount}`);
}

// Test 4: Get one order with dish details
console.log('\n--- Testing order with dish join ---');
const { data: orderSample, error: sampleError } = await supabase
  .from('orders')
  .select('id, delivery_date, quantity, dishes(id, name, category)')
  .eq('delivery_date', '2026-02-10')
  .limit(5);

if (sampleError) {
  console.error('Error:', sampleError);
} else {
  console.log(`Found ${orderSample?.length || 0} orders for Feb 10:`);
  orderSample?.forEach(o => {
    const dish = o.dishes;
    console.log(`  Order ${o.id}: ${o.quantity}x ${dish?.name || 'NO DISH'} (dish_id: ${dish?.id || 'NULL'})`);
  });
}
