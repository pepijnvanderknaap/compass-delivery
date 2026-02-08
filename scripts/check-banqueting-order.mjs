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

console.log('=== CHECKING BANQUETING ORDERS ===\n');

// Get all banqueting orders
const { data: orders, error: ordersError } = await supabase
  .from('banqueting_orders')
  .select('*')
  .order('created_at', { ascending: false });

if (ordersError) {
  console.error('Error fetching orders:', ordersError);
} else {
  console.log(`Found ${orders.length} order(s):\n`);
  orders.forEach((order, index) => {
    console.log(`Order ${index + 1}:`);
    console.log(`  ID: ${order.id}`);
    console.log(`  Company: ${order.company_name}`);
    console.log(`  Location ID: ${order.location_id}`);
    console.log(`  Total: €${order.total_amount}`);
    console.log(`  Created: ${order.created_at}`);
    console.log('');
  });
}

// Get Symphony location
const { data: location, error: locationError } = await supabase
  .from('locations')
  .select('*')
  .eq('name', 'Symphony')
  .single();

if (locationError) {
  console.error('Error fetching Symphony location:', locationError);
} else {
  console.log('Symphony Location:');
  console.log(`  ID: ${location.id}`);
  console.log(`  Name: ${location.name}`);
}
