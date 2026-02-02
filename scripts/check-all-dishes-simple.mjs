import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: allDishes, error } = await supabase
  .from('dishes')
  .select('id, name, category')
  .limit(50);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('Total dishes found:', allDishes.length);
if (allDishes.length > 0) {
  console.log('\nAll dishes:');
  allDishes.forEach(d => {
    const category = d.category || 'N/A';
    console.log('  - ' + d.name + ' (category: ' + category + ')');
  });
}
