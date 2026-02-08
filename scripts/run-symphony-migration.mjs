import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

dotenv.config({ path: join(projectRoot, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

console.log('=== RUNNING SYMPHONY COMPANIES MIGRATION ===\n');

const sqlScript = readFileSync(join(__dirname, 'create-symphony-companies.sql'), 'utf-8');

// Split into individual statements (simple split on semicolon)
const statements = sqlScript
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

for (const statement of statements) {
  console.log(`Executing: ${statement.substring(0, 50)}...`);

  const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Success');
  }
}

console.log('\n=== MIGRATION COMPLETE ===');
