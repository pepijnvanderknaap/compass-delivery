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

console.log('=== ALL ORDERS ===\n');

const { data: orders } = await supabase
  .from('orders')
  .select('*')
  .order('delivery_date', { ascending: true });

console.log(`Total orders: ${orders?.length || 0}\n`);

if (orders && orders.length > 0) {
  // Group by delivery date
  const byDate = {};
  orders.forEach(o => {
    if (!byDate[o.delivery_date]) {
      byDate[o.delivery_date] = [];
    }
    byDate[o.delivery_date].push(o);
  });

  for (const date of Object.keys(byDate).sort()) {
    console.log(`\n=== ${date} ===`);
    const dateOrders = byDate[date];

    // Get unique dishes for this date
    const dishIds = [...new Set(dateOrders.map(o => o.dish_id))];

    for (const dishId of dishIds) {
      // Get dish name
      const { data: dish } = await supabase
        .from('dishes')
        .select('name, category')
        .eq('id', dishId)
        .single();

      const dishOrders = dateOrders.filter(o => o.dish_id === dishId);
      const totalQty = dishOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

      console.log(`  ${dish?.name || dishId}: ${dishOrders.length} orders, ${totalQty} portions`);
    }
  }
}
