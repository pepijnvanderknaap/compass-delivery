const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function calcChickenBiryaniProduction() {
  console.log('Calculating Chicken Biryani production for Monday Jan 26, 2026...\n');

  // Get Chicken Biryani dish
  const { data: dish } = await supabase
    .from('dishes')
    .select('id, name, portion_size')
    .ilike('name', '%Chicken Biryani%')
    .single();

  console.log(`Dish: ${dish.name}`);
  console.log(`Portion size: ${dish.portion_size}g\n`);

  // Get ALL order_items with meal_type = hot_meat for Jan 26
  const { data: allHotMeat } = await supabase
    .from('order_items')
    .select('id, portions, dish_id, dishes(name, portion_size), orders(locations(name))')
    .eq('delivery_date', '2026-01-26')
    .eq('meal_type', 'hot_meat');

  console.log('ALL hot_meat order_items for Jan 26:\n');

  let totalPortionsAllDishes = 0;
  let chickenBiryaniPortions = 0;

  allHotMeat?.forEach(item => {
    console.log(`  ${item.orders.locations.name}: ${item.portions} portions of ${item.dishes.name} (${item.dishes.portion_size}g)`);
    totalPortionsAllDishes += item.portions;
    if (item.dish_id === dish.id) {
      chickenBiryaniPortions += item.portions;
    }
  });

  console.log(`\n--- TOTALS ---`);
  console.log(`Total hot_meat portions (all dishes): ${totalPortionsAllDishes}`);
  console.log(`Chicken Biryani portions only: ${chickenBiryaniPortions}`);
  console.log(`\n--- PRODUCTION SHEET CALCULATION ---`);
  console.log(`The production sheet uses meal_type filtering, so it will show:`);
  console.log(`  All hot_meat portions: ${totalPortionsAllDishes}`);
  console.log(`  × Chicken Biryani portion size: ${dish.portion_size}g`);
  console.log(`  = ${totalPortionsAllDishes * dish.portion_size / 1000}kg`);
  console.log(`\nBut it SHOULD only show Chicken Biryani portions:`);
  console.log(`  Chicken Biryani only: ${chickenBiryaniPortions} portions`);
  console.log(`  × ${dish.portion_size}g`);
  console.log(`  = ${chickenBiryaniPortions * dish.portion_size / 1000}kg`);
}

calcChickenBiryaniProduction();
