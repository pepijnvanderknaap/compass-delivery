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

async function analyzeDish(dishId: string, dishName: string) {
  console.log(`\n📋 Analyzing: ${dishName}`);
  console.log('─'.repeat(60));

  // Check dish_components
  const { data: dishComps } = await supabase
    .from('dish_components')
    .select('*, component_dish:dishes!component_dish_id(name)')
    .eq('main_dish_id', dishId);

  console.log(`  dish_components table: ${dishComps?.length || 0} entries`);
  if (dishComps && dishComps.length > 0) {
    dishComps.forEach(dc => {
      console.log(`    - ${dc.component_type}: ${dc.component_dish.name}`);
    });
  }

  // Check salad_components
  const { data: saladComps } = await supabase
    .from('salad_components')
    .select('*, component_dish:dishes!component_dish_id(name)')
    .eq('main_dish_id', dishId);

  console.log(`  salad_components table: ${saladComps?.length || 0} entries`);
  if (saladComps && saladComps.length > 0) {
    saladComps.forEach(sc => {
      console.log(`    - ${sc.component_dish.name}: ${sc.percentage}%`);
    });
  }

  // Check warm_veggie_components
  const { data: warmVeggieComps } = await supabase
    .from('warm_veggie_components')
    .select('*, component_dish:dishes!component_dish_id(name)')
    .eq('main_dish_id', dishId);

  console.log(`  warm_veggie_components table: ${warmVeggieComps?.length || 0} entries`);
  if (warmVeggieComps && warmVeggieComps.length > 0) {
    warmVeggieComps.forEach(wv => {
      console.log(`    - ${wv.component_dish.name}: ${wv.percentage}%`);
    });
  }

  // Check main dish fields
  const { data: dish } = await supabase
    .from('dishes')
    .select('salad_total_portion_g, warm_veggie_total_portion_g')
    .eq('id', dishId)
    .single();

  console.log(`  salad_total_portion_g: ${dish?.salad_total_portion_g || 'NULL'}`);
  console.log(`  warm_veggie_total_portion_g: ${dish?.warm_veggie_total_portion_g || 'NULL'}`);
}

async function compareWorkingVsBroken() {
  console.log('=== Comparing Working Days vs Thursday Jan 29 ===\n');

  // Get a working day (e.g., Tuesday Jan 27)
  console.log('1️⃣  Getting dishes from a WORKING day (Tuesday Jan 27, 2026)...\n');

  const { data: workingMenu } = await supabase
    .from('menus')
    .select('id')
    .eq('start_date', '2026-01-26')
    .single();

  if (!workingMenu) {
    console.log('❌ No menu found for week of Jan 26');
    return;
  }

  const { data: workingDishes } = await supabase
    .from('menu_items')
    .select('*, dish:dishes(id, name)')
    .eq('menu_id', workingMenu.id)
    .eq('day_of_week', 1) // Tuesday
    .in('meal_type', ['hot_meat', 'hot_veg']);

  if (workingDishes && workingDishes.length > 0) {
    console.log('Working day dishes (Tuesday):');
    for (const item of workingDishes) {
      await analyzeDish(item.dish.id, `${item.dish.name} (${item.meal_type})`);
    }
  } else {
    console.log('❌ No hot dishes found for Tuesday');
  }

  // Get broken day (Thursday Jan 29)
  console.log('\n\n2️⃣  Getting dishes from BROKEN day (Thursday Jan 29, 2026)...\n');

  const { data: brokenDishes } = await supabase
    .from('menu_items')
    .select('*, dish:dishes(id, name)')
    .eq('menu_id', workingMenu.id)
    .eq('day_of_week', 3) // Thursday
    .in('meal_type', ['hot_meat', 'hot_veg']);

  if (brokenDishes && brokenDishes.length > 0) {
    console.log('Broken day dishes (Thursday):');
    for (const item of brokenDishes) {
      await analyzeDish(item.dish.id, `${item.dish.name} (${item.meal_type})`);
    }
  } else {
    console.log('❌ No hot dishes found for Thursday');
  }

  console.log('\n\n=== ANALYSIS ===');
  console.log('Compare the component setup between working and broken days.');
  console.log('Look for:');
  console.log('  - Are salads in dish_components or salad_components table?');
  console.log('  - Are salad_total_portion_g values set on main dishes?');
  console.log('  - Is there a pattern difference between days that work vs don\'t work?');
}

compareWorkingVsBroken().catch(console.error);
