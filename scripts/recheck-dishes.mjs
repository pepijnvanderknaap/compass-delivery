import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Connecting to:', supabaseUrl);
console.log('');

const { data, error, count } = await supabase
  .from('dishes')
  .select('*', { count: 'exact' });

if (error) {
  console.error('Error:', error);
} else {
  console.log('Total dishes:', count);
  console.log('Data length:', data.length);
  
  if (data.length > 0) {
    // Group by category
    const groups = {};
    data.forEach(d => {
      const cat = d.category || 'uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(d.name);
    });
    
    console.log('\nBreakdown by category:');
    Object.keys(groups).sort().forEach(cat => {
      console.log('  ' + cat + ': ' + groups[cat].length);
    });
  }
}
