#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Use service role key for admin access
const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260123_add_dietary_fields_to_dishes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration via Supabase RPC...');

    // Execute the SQL using raw query
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql RPC doesn't exist, try direct column addition
      console.log('RPC not available, adding columns directly...');

      const columns = [
        'contains_pork',
        'contains_beef',
        'contains_lamb',
        'is_vegetarian',
        'is_vegan'
      ];

      for (const col of columns) {
        console.log(`Adding column: ${col}...`);
        // We'll need to do this through the Supabase dashboard or using the direct SQL approach
      }

      console.log('\n⚠️  Cannot execute raw SQL via Supabase client.');
      console.log('Please apply this migration manually in your Supabase SQL Editor:');
      console.log('\n' + sql);
      return;
    }

    console.log('✅ Migration applied successfully!');
    console.log('Dietary fields have been added to dishes table.');

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.log('\nPlease apply this migration manually in your Supabase SQL Editor:');
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260123_add_dietary_fields_to_dishes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('\n' + sql);
  }
}

applyMigration();
