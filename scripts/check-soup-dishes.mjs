import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Check for dishes with "soup" in the name
const { data: soupDishes, error } = await supabase
  .from('dishes')
  .select('id, name, category')
  .ilike('name', '%soup%');

if (error) {
  console.error('Error fetching dishes:', error);
  process.exit(1);
}

console.log(`Found ${soupDishes.length} dishes with "soup" in the name:`);
soupDishes.forEach(d => console.log(`  - ${d.name} (${d.category})`));
