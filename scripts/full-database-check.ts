import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fullCheck() {
  console.log('=== Full Database Check ===\n');
  console.log('Supabase URL:', supabaseUrl);
  console.log('');

  // Check menus
  console.log('1. Checking menus table...');
  const { data: menus, error: menusError } = await supabase
    .from('menus')
    .select('*');

  if (menusError) {
    console.error('  Error:', menusError.message);
  } else {
    console.log(`  ✅ Found ${menus?.length || 0} menus`);
    if (menus && menus.length > 0) {
      console.log('  Dates:', menus.map(m => m.start_date).join(', '));
    }
  }
  console.log('');

  // Check order_items
  console.log('2. Checking order_items table...');
  const { data: orderItems, error: orderItemsError } = await supabase
    .from('order_items')
    .select('*')
    .limit(10);

  if (orderItemsError) {
    console.error('  Error:', orderItemsError.message);
  } else {
    console.log(`  ✅ Found ${orderItems?.length || 0} order items (showing first 10)`);
    if (orderItems && orderItems.length > 0) {
      const dates = [...new Set(orderItems.map(o => o.delivery_date))];
      console.log('  Delivery dates:', dates.join(', '));
    }
  }
  console.log('');

  // Check orders
  console.log('3. Checking orders table...');
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .limit(10);

  if (ordersError) {
    console.error('  Error:', ordersError.message);
  } else {
    console.log(`  ✅ Found ${orders?.length || 0} orders (showing first 10)`);
    if (orders && orders.length > 0) {
      const weekStarts = [...new Set(orders.map(o => o.week_start_date))];
      console.log('  Week start dates:', weekStarts.join(', '));
    }
  }
  console.log('');

  // Check dishes
  console.log('4. Checking dishes table...');
  const { data: dishes, error: dishesError } = await supabase
    .from('dishes')
    .select('id, name, category')
    .limit(5);

  if (dishesError) {
    console.error('  Error:', dishesError.message);
  } else {
    console.log(`  ✅ Found ${dishes?.length || 0} dishes (showing first 5)`);
    if (dishes && dishes.length > 0) {
      dishes.forEach(d => console.log(`    - ${d.name} (${d.category})`));
    }
  }
  console.log('');

  // Check locations
  console.log('5. Checking locations table...');
  const { data: locations, error: locationsError } = await supabase
    .from('locations')
    .select('*');

  if (locationsError) {
    console.error('  Error:', locationsError.message);
  } else {
    console.log(`  ✅ Found ${locations?.length || 0} locations`);
    if (locations && locations.length > 0) {
      locations.forEach(l => console.log(`    - ${l.name}`));
    }
  }
  console.log('');

  console.log('=== Summary ===');
  console.log('If you are seeing data in the production sheet but these queries show empty results,');
  console.log('it could mean:');
  console.log('  1. You are connected to a different Supabase project/environment');
  console.log('  2. The .env.local file has different credentials than what the app uses');
  console.log('  3. Row-level security policies are blocking access');
}

fullCheck().catch(console.error);
