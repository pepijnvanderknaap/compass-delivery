import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== MENU_ITEMS TABLE INVESTIGATION ===\n');

const { data: menuItems, error } = await supabase
  .from('menu_items')
  .select('*');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('Total menu_items: ' + menuItems.length + '\n');

// Show structure of first item
if (menuItems.length > 0) {
  console.log('Structure (first item):');
  console.log(JSON.stringify(menuItems[0], null, 2));
  console.log('\n');
}

// Group by category
const categoryCounts = {};
menuItems.forEach(item => {
  const cat = item.category || 'uncategorized';
  if (!categoryCounts[cat]) {
    categoryCounts[cat] = [];
  }
  categoryCounts[cat].push(item.name || item.title || item.id);
});

console.log('Categories and counts:');
console.log('─'.repeat(60));
Object.entries(categoryCounts).sort().forEach(([category, items]) => {
  console.log('\n' + category.toUpperCase() + ': ' + items.length + ' items');
  items.forEach(name => console.log('  - ' + name));
});
