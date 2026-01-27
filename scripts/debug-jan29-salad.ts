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

async function debugJan29Production() {
  console.log('=== Investigating Production Sheet for Thursday, January 29, 2026 ===\n');

  // 1. Check menu for week containing Jan 29
  console.log('1. Checking menu configuration...');
  const { data: menuData } = await supabase
    .from('menus')
    .select('*')
    .eq('start_date', '2026-01-26')
    .single();

  if (!menuData) {
    console.log('❌ No menu found for week starting Jan 26, 2026');
    return;
  }
  console.log('✅ Menu found:', menuData);

  // 2. Check menu items for Thursday (day_of_week = 3)
  console.log('\n2. Checking Thursday menu items...');
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*, dish:dishes(*)')
    .eq('menu_id', menuData.id)
    .eq('day_of_week', 3)
    .in('meal_type', ['hot_meat', 'hot_veg']);

  if (!menuItems || menuItems.length === 0) {
    console.log('❌ No hot dishes found for Thursday');
    return;
  }
  console.log('✅ Found dishes:');
  menuItems.forEach(mi => {
    console.log(`  - ${mi.meal_type}: ${mi.dish.name} (salad_total_portion_g: ${mi.dish.salad_total_portion_g})`);
  });

  // 3. Check dish components for each dish
  console.log('\n3. Checking dish components...');
  for (const menuItem of menuItems) {
    console.log(`\n  Dish: ${menuItem.dish.name}`);

    // Check regular components
    const { data: components } = await supabase
      .from('dish_components')
      .select('*, component_dish:dishes!component_dish_id(*)')
      .eq('main_dish_id', menuItem.dish_id);

    if (components && components.length > 0) {
      console.log('    Regular components:');
      components.forEach(c => {
        console.log(`      - ${c.component_type}: ${c.component_dish.name}`);
      });
    } else {
      console.log('    ⚠️  No regular components found');
    }

    // Check salad components
    const { data: saladComponents } = await supabase
      .from('salad_components')
      .select('*, component_dish:dishes!component_dish_id(*)')
      .eq('main_dish_id', menuItem.dish_id);

    if (saladComponents && saladComponents.length > 0) {
      console.log('    Salad components:');
      saladComponents.forEach(sc => {
        console.log(`      - ${sc.component_dish.name}: ${sc.percentage}%`);
      });
    } else {
      console.log('    ⚠️  No salad components found');
    }

    // Check warm veggie components
    const { data: warmVeggieComponents } = await supabase
      .from('warm_veggie_components')
      .select('*, component_dish:dishes!component_dish_id(*)')
      .eq('main_dish_id', menuItem.dish_id);

    if (warmVeggieComponents && warmVeggieComponents.length > 0) {
      console.log('    Warm veggie components:');
      warmVeggieComponents.forEach(wv => {
        console.log(`      - ${wv.component_dish.name}: ${wv.percentage}%`);
      });
    } else {
      console.log('    ⚠️  No warm veggie components found');
    }
  }

  // 4. Check orders for Jan 29
  console.log('\n4. Checking orders for January 29, 2026...');
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('delivery_date', '2026-01-29')
    .in('meal_type', ['hot_meat', 'hot_veg']);

  if (!orders || orders.length === 0) {
    console.log('❌ No orders found for January 29, 2026');
    return;
  }

  console.log('✅ Orders found:');
  const ordersByMealType = orders.reduce((acc, order) => {
    if (!acc[order.meal_type]) acc[order.meal_type] = { count: 0, portions: 0 };
    acc[order.meal_type].count++;
    acc[order.meal_type].portions += order.portions;
    return acc;
  }, {} as Record<string, { count: number; portions: number }>);

  Object.entries(ordersByMealType).forEach(([mealType, stats]) => {
    const statsTyped = stats as { count: number; portions: number };
    console.log(`  ${mealType}: ${statsTyped.count} orders, ${statsTyped.portions} total portions`);
  });

  console.log('\n=== End of Investigation ===');
}

debugJan29Production().catch(console.error);
