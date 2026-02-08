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

console.log('=== DATABASE CLEANLINESS CHECK ===\n');

// Check all locations
console.log('1. LOCATIONS TABLE:');
const { data: locations, error: locError } = await supabase
  .from('locations')
  .select('*')
  .order('name');

if (locError) {
  console.error('Error:', locError);
} else {
  console.log(`Found ${locations.length} locations:\n`);
  locations.forEach(loc => {
    console.log(`  - ${loc.name} (ID: ${loc.id})`);
  });
}

// Check user profiles and their locations
console.log('\n2. USER PROFILES:');
const { data: profiles, error: profError } = await supabase
  .from('user_profiles')
  .select('id, full_name, role, location_id, locations(name)')
  .order('full_name');

if (profError) {
  console.error('Error:', profError);
} else {
  console.log(`Found ${profiles.length} user profiles:\n`);
  profiles.forEach(p => {
    const locationName = p.locations ? p.locations.name : 'None';
    console.log(`  - ${p.full_name} | Role: ${p.role} | Location: ${locationName}`);
  });
}

// Check banqueting orders
console.log('\n3. BANQUETING ORDERS:');
const { data: orders, error: ordError } = await supabase
  .from('banqueting_orders')
  .select('id, company_name, total_amount, location_id, created_at')
  .order('created_at', { ascending: false });

if (ordError) {
  console.error('Error:', ordError);
} else {
  console.log(`Found ${orders.length} orders:\n`);
  orders.forEach((o, i) => {
    const loc = locations.find(l => l.id === o.location_id);
    const locationName = loc ? loc.name : 'Unknown';
    console.log(`  ${i+1}. ${o.company_name} - €${o.total_amount} - Location: ${locationName}`);
  });
}

// Check symphony_companies
console.log('\n4. SYMPHONY COMPANIES (for PIN auth):');
const { data: companies, error: compError } = await supabase
  .from('symphony_companies')
  .select('*')
  .order('company_name');

if (compError) {
  console.error('Error:', compError);
} else {
  console.log(`Found ${companies.length} companies:\n`);
  companies.forEach(c => {
    const floor = c.floor_number ? c.floor_number : 'N/A';
    console.log(`  - ${c.company_name} | Active: ${c.is_active} | Floor: ${floor}`);
  });
}

// Check banqueting_items (catalog)
console.log('\n5. BANQUETING CATALOG ITEMS:');
const { data: items, error: itemsError } = await supabase
  .from('banqueting_items')
  .select('id, name, category, price, is_active')
  .order('category, name');

if (itemsError) {
  console.error('Error:', itemsError);
} else {
  console.log(`Found ${items.length} catalog items:\n`);
  const byCategory = {};
  items.forEach(item => {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  });

  Object.keys(byCategory).forEach(cat => {
    console.log(`  ${cat}: ${byCategory[cat].length} items`);
    byCategory[cat].forEach(item => {
      const status = item.is_active ? '✓' : '✗ INACTIVE';
      console.log(`    - ${item.name} (€${item.price}) ${status}`);
    });
  });
}

console.log('\n=== END OF DATABASE CHECK ===');
