import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== DATABASE INVESTIGATION ===\n');

// 1. Check all dishes and their categories
console.log('1. DISHES TABLE - Categories and Counts:');
console.log('─'.repeat(60));
const { data: allDishes, error: dishError } = await supabase
  .from('dishes')
  .select('id, name, category');

if (dishError) {
  console.error('Error fetching dishes:', dishError);
} else {
  // Group by category
  const categoryCounts = {};
  allDishes.forEach(dish => {
    const cat = dish.category || 'uncategorized';
    if (!categoryCounts[cat]) {
      categoryCounts[cat] = [];
    }
    categoryCounts[cat].push(dish.name);
  });

  console.log('Total dishes: ' + allDishes.length + '\n');

  Object.entries(categoryCounts).sort().forEach(([category, dishes]) => {
    console.log(category + ': ' + dishes.length + ' dishes');
    dishes.forEach(name => console.log('  - ' + name));
    console.log('');
  });
}

// 2. Check components table
console.log('\n2. COMPONENTS TABLE:');
console.log('─'.repeat(60));
const { data: components, error: compError } = await supabase
  .from('components')
  .select('*')
  .limit(100);

if (compError) {
  console.log('Error or table does not exist: ' + compError.message);
} else {
  console.log('Total components: ' + components.length);
  if (components.length > 0) {
    console.log('\nSample components:');
    components.slice(0, 10).forEach(c => {
      console.log('  - ' + c.name + ' (category: ' + (c.category || 'N/A') + ')');
    });
  }
}

// 3. Check recipes table
console.log('\n3. RECIPES TABLE:');
console.log('─'.repeat(60));
const { data: recipes, error: recError } = await supabase
  .from('recipes')
  .select('id, name, dish_id');

if (recError) {
  console.log('Error: ' + recError.message);
} else {
  console.log('Total recipes: ' + recipes.length);
}

// 4. List all tables we can access
console.log('\n4. ATTEMPTING TO FIND OTHER TABLES:');
console.log('─'.repeat(60));

const tablesToCheck = [
  'dish_components',
  'toppings',
  'soup_toppings',
  'carbs',
  'vegetables',
  'add_ons',
  'salad_mixes',
  'ingredients',
  'menu_items',
  'categories'
];

for (const table of tablesToCheck) {
  const { data, error } = await supabase.from(table).select('*').limit(1);
  if (!error) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log('✓ ' + table + ': ' + count + ' records');
  } else {
    console.log('✗ ' + table + ': does not exist or no access');
  }
}

console.log('\n=== END INVESTIGATION ===');
