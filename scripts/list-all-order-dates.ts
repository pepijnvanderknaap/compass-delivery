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

async function listAllOrderDates() {
  console.log('=== All Order Items in Database ===\n');

  const { data: orderItems, error } = await supabase
    .from('order_items')
    .select('delivery_date, meal_type, portions')
    .order('delivery_date', { ascending: true });

  if (error) {
    console.error('Error fetching order items:', error);
    return;
  }

  if (!orderItems || orderItems.length === 0) {
    console.log('❌ No order items found in database');
    return;
  }

  console.log(`Found ${orderItems.length} order items\n`);

  // Group by date
  const byDate = orderItems.reduce((acc, item) => {
    if (!acc[item.delivery_date]) {
      acc[item.delivery_date] = {};
    }
    if (!acc[item.delivery_date][item.meal_type]) {
      acc[item.delivery_date][item.meal_type] = { count: 0, portions: 0 };
    }
    acc[item.delivery_date][item.meal_type].count++;
    acc[item.delivery_date][item.meal_type].portions += item.portions;
    return acc;
  }, {} as Record<string, Record<string, { count: number; portions: number }>>);

  Object.entries(byDate).forEach(([date, mealTypes]) => {
    const dateObj = new Date(date);
    console.log(`${dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (${date}):`);
    Object.entries(mealTypes).forEach(([mealType, stats]) => {
      console.log(`  ${mealType}: ${stats.count} items, ${stats.portions} portions`);
    });
    console.log('');
  });

  console.log('=== Note ===');
  console.log('January 29, 2026 is a Thursday');
  const hasJan29 = Object.keys(byDate).includes('2026-01-29');
  if (hasJan29) {
    console.log('✅ Order items exist for January 29, 2026');
  } else {
    console.log('❌ No order items exist for January 29, 2026');
    console.log('   The production sheet will be empty because there are no orders');
  }
}

listAllOrderDates().catch(console.error);
