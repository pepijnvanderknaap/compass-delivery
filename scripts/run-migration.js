const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260124_add_dish_card_fields.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Running migration...');
  console.log(sql);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct execution via REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: sql })
      });

      if (!response.ok) {
        throw new Error(`Migration failed: ${error?.message || 'Unknown error'}`);
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\nThe following columns have been added to the dishes table:');
    console.log('  - portion_display');
    console.log('  - calories_display');
    console.log('  - origin_display');
    console.log('  - cooking_method');
    console.log('  - prep_time');
    console.log('  - chef_note');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.log('\nPlease run this SQL manually in your Supabase dashboard:');
    console.log('\n' + sql);
    process.exit(1);
  }
}

runMigration();
