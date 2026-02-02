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

console.log('=== TESTING WITH SERVICE ROLE KEY ===\n');
console.log('This key bypasses Row Level Security policies\n');

const supabase = createClient(supabaseUrl, serviceKey);

// Test 1: Count all tables
console.log('--- Table counts ---');

const { data: dishes, error: dishesError, count: dishesCount } = await supabase
  .from('dishes')
  .select('*', { count: 'exact', head: true });

console.log(`Dishes: ${dishesCount || 0}${dishesError ? ` (Error: ${dishesError.message})` : ''}`);

const { data: recipes, error: recipesError, count: recipesCount } = await supabase
  .from('recipes')
  .select('*', { count: 'exact', head: true });

console.log(`Recipes: ${recipesCount || 0}${recipesError ? ` (Error: ${recipesError.message})` : ''}`);

const { data: orders, error: ordersError, count: ordersCount } = await supabase
  .from('orders')
  .select('*', { count: 'exact', head: true });

console.log(`Orders: ${ordersCount || 0}${ordersError ? ` (Error: ${ordersError.message})` : ''}`);

// Test 2: List actual dishes
console.log('\n--- Actual Dishes ---');
const { data: allDishes } = await supabase
  .from('dishes')
  .select('id, name, category')
  .order('name')
  .limit(10);

allDishes?.forEach(d => {
  console.log(`  ${d.name} (${d.category}) - ID: ${d.id}`);
});

// Test 3: List actual recipes
console.log('\n--- Actual Recipes ---');
const { data: allRecipes } = await supabase
  .from('recipes')
  .select('id, name, dish_id')
  .order('name')
  .limit(10);

allRecipes?.forEach(r => {
  console.log(`  ${r.name} - dish_id: ${r.dish_id || 'NULL'} - ID: ${r.id}`);
});

// Test 4: Check Feb 10 orders
console.log('\n--- Orders for Feb 10, 2026 ---');
const { data: feb10Orders } = await supabase
  .from('orders')
  .select('*')
  .eq('delivery_date', '2026-02-10');

console.log(`Found ${feb10Orders?.length || 0} orders`);
feb10Orders?.forEach(o => {
  console.log(`  Order ${o.id}: Qty ${o.quantity}, dish_id: ${o.dish_id}, Location: ${o.location_id}`);
});
