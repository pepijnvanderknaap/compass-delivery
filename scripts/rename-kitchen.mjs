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

console.log('=== RENAMING "Dark Kitchen" TO "Kitchen" ===\n');

// Update the location name
const { data, error } = await supabase
  .from('locations')
  .update({ name: 'Kitchen' })
  .eq('name', 'Dark Kitchen')
  .select();

if (error) {
  console.error('Error updating location:', error);
} else {
  console.log('✅ Successfully renamed location!');
  console.log('Updated record:', data);
}

// Verify the change
console.log('\n=== VERIFICATION ===\n');
const { data: allLocations } = await supabase
  .from('locations')
  .select('*')
  .order('name');

console.log('All locations:');
allLocations.forEach(loc => {
  console.log(`  - ${loc.name} (ID: ${loc.id})`);
});
