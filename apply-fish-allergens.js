import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('=== Adding Fish and Shellfish Allergen Columns ===\n');

  const sql = `
    -- Add fish and shellfish allergen columns to dishes table
    ALTER TABLE dishes
    ADD COLUMN IF NOT EXISTS allergen_fish BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS allergen_shellfish BOOLEAN DEFAULT false;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('Error:', error);
      console.log('\nTrying alternative approach...');

      // Alternative: Use the SQL editor or direct API call
      console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
      console.log(sql);
      console.log('\nOr the columns may already exist.');
    } else {
      console.log('✅ Migration applied successfully');
    }
  } catch (err) {
    console.error('Error applying migration:', err);
    console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
    console.log(sql);
  }
}

applyMigration();
