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
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== DISHES TABLE - COMPLETE BREAKDOWN ===\n');

const { data, error, count } = await supabase
  .from('dishes')
  .select('*', { count: 'exact' });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('TOTAL DISHES: ' + count + '\n');

// Group by category
const groups = {};
data.forEach(d => {
  const cat = d.category || 'uncategorized';
  if (!groups[cat]) groups[cat] = [];
  groups[cat].push(d.name);
});

console.log('BREAKDOWN BY CATEGORY:');
console.log('─'.repeat(60));

const categoryOrder = [
  'soup',
  'soup_toppings',
  'hot_dish_meat',
  'hot_dish_fish',
  'hot_dish_veg',
  'carbs',
  'warm_vegetables',
  'hot_dish_add_ons',
  'salad_mixes'
];

categoryOrder.forEach(cat => {
  if (groups[cat]) {
    console.log('\n' + cat.toUpperCase().replace(/_/g, ' ') + ': ' + groups[cat].length + ' items');
    groups[cat].sort().forEach(name => console.log('  - ' + name));
    delete groups[cat];
  }
});

// Show any remaining categories not in the order list
Object.keys(groups).sort().forEach(cat => {
  console.log('\n' + cat.toUpperCase() + ': ' + groups[cat].length + ' items');
  groups[cat].sort().forEach(name => console.log('  - ' + name));
});
