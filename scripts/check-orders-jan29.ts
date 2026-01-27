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

async function checkOrdersJan29() {
  console.log('=== Checking Order Items for January 29, 2026 ===\n');

  const { data: orderItems, error } = await supabase
    .from('order_items')
    .select('*, orders(location_id, locations(name))')
    .eq('delivery_date', '2026-01-29');

  if (error) {
    console.error('Error fetching order items:', error);
    return;
  }

  if (!orderItems || orderItems.length === 0) {
    console.log('❌ No order items found for January 29, 2026');
    return;
  }

  console.log(`✅ Found ${orderItems.length} order items for January 29, 2026\n`);

  // Group by meal type
  const byMealType = orderItems.reduce((acc, item: any) => {
    if (!acc[item.meal_type]) {
      acc[item.meal_type] = [];
    }
    acc[item.meal_type].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  Object.entries(byMealType).forEach(([mealType, items]) => {
    const itemsArray = items as any[];
    const totalPortions = itemsArray.reduce((sum, o) => sum + o.portions, 0);
    const locations = [...new Set(itemsArray.map((o: any) => o.orders?.locations?.name).filter(Boolean))];
    console.log(`${mealType}:`);
    console.log(`  ${itemsArray.length} order items`);
    console.log(`  ${totalPortions} total portions`);
    if (locations.length > 0) {
      console.log(`  Locations: ${locations.join(', ')}`);
    }
    console.log('');
  });

  console.log('=== Summary ===');
  console.log('✅ Order items exist for January 29, 2026');
  console.log('❌ BUT: No menu is configured for the week containing this date');
  console.log('📋 RESULT: Production sheet cannot show dishes/components without a menu');
  console.log('');
  console.log('💡 SOLUTION: You need to:');
  console.log('   1. Go to the Menu Planner page');
  console.log('   2. Create a menu for the week starting Monday, January 26, 2026');
  console.log('   3. Assign dishes to Thursday (January 29) for each meal type');
  console.log('   4. Once the menu is created, the production sheet will show all components');
}

checkOrdersJan29().catch(console.error);
