#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260209_add_kitchen_manager_2_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration: 20260209_add_kitchen_manager_2_fields.sql');
    console.log('Executing SQL...');

    // Execute the SQL directly
    const { data, error } = await supabase
      .from('location_settings')
      .select('id')
      .limit(1);

    // Actually, we need to use a different approach - let's use the SQL editor API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      console.error('Migration failed:', await response.text());
      console.log('\nPlease run this SQL manually in the Supabase SQL Editor:');
      console.log(sql);
      process.exit(1);
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Error running migration:', err.message);
    console.log('\nPlease run this SQL manually in the Supabase SQL Editor:');
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260209_add_kitchen_manager_2_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log(sql);
  }
}

runMigration();
