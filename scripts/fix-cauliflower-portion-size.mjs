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

console.log('=== SETTING CAULIFLOWER SOUP PORTION SIZE ===\n');

// Soups are typically 300ml per portion
const soupPortionMl = 300;

const { error } = await supabase
  .from('dishes')
  .update({
    default_portion_size_ml: soupPortionMl
  })
  .eq('name', 'Cauliflower Soup');

if (error) {
  console.error('Error:', error);
} else {
  console.log(`✅ Updated Cauliflower Soup:`);
  console.log(`   default_portion_size_ml: ${soupPortionMl}`);
  console.log(`   portion_unit: ml`);
}

// Verify
const { data: dish } = await supabase
  .from('dishes')
  .select('name, default_portion_size_ml, portion_unit')
  .eq('name', 'Cauliflower Soup')
  .single();

console.log('\nVerification:');
console.log(dish);
