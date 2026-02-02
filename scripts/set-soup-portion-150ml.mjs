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

console.log('=== SETTING SOUP PORTION SIZE TO 150ML ===\n');

const { error } = await supabase
  .from('dishes')
  .update({
    default_portion_size_ml: 150
  })
  .eq('name', 'Cauliflower Soup');

if (error) {
  console.error('Error:', error);
} else {
  console.log(`✅ Updated Cauliflower Soup to 150ml per portion`);
}

// Verify
const { data: dish } = await supabase
  .from('dishes')
  .select('name, default_portion_size_ml, portion_size')
  .eq('name', 'Cauliflower Soup')
  .single();

console.log('\nVerification:', dish);
console.log('\nCalculation check:');
console.log('20 portions × 150ml = 3000ml = 3.0 liters ✅');
