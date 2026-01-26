#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Construct database URL from Supabase project
// Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
const projectRef = 'agwheuqqvdtcaqpgviya';
const password = process.env.DB_PASSWORD || 'YOUR_DB_PASSWORD'; // Database password (not service role key)

const client = new Client({
  connectionString: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully.');

    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260123_add_dietary_fields_to_dishes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration...');
    await client.query(sql);

    console.log('✅ Migration applied successfully!');
    console.log('Dietary fields (contains_pork, contains_beef, contains_lamb, is_vegetarian, is_vegan) have been added to dishes table.');

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    if (error.message.includes('password authentication failed')) {
      console.error('\nPlease set the DB_PASSWORD environment variable with your Supabase database password.');
      console.error('Example: DB_PASSWORD=your_password node apply-migration.js');
    }
  } finally {
    await client.end();
  }
}

applyMigration();
