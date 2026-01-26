const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkSnap119Detailed() {
  console.log('Detailed check for SnapChat 119 Monday Jan 26, 2026...\n');

  // Get SnapChat 119 location ID
  const { data: location } = await supabase
    .from('locations')
    .select('id, name')
    .eq('name', 'SnapChat 119')
    .single();

  console.log(`Location: ${location.name}`);
  console.log(`Location ID: ${location.id}\n`);

  // Get the order
  const { data: order } = await supabase
    .from('orders')
    .select('id, week_start_date')
    .eq('location_id', location.id)
    .eq('week_start_date', '2026-01-26')
    .single();

  console.log(`Order ID: ${order.id}\n`);

  // Get ALL order_items for SnapChat 119 on Jan 26 (including any duplicates)
  const { data: allItems } = await supabase
    .from('order_items')
    .select('id, portions, meal_type, dish_id, dishes(name, category, portion_size), created_at')
    .eq('order_id', order.id)
    .eq('delivery_date', '2026-01-26')
    .order('meal_type')
    .order('created_at');

  console.log(`=== ALL ORDER_ITEMS FOR SNAP 119 ON JAN 26 ===\n`);
  console.log(`Total items: ${allItems?.length || 0}\n`);

  allItems?.forEach((item, index) => {
    console.log(`Item ${index + 1}:`);
    console.log(`  ID: ${item.id}`);
    console.log(`  Meal type: ${item.meal_type}`);
    console.log(`  Dish: ${item.dishes.name}`);
    console.log(`  Category: ${item.dishes.category}`);
    console.log(`  Portions: ${item.portions}`);
    console.log(`  Portion size: ${item.dishes.portion_size}g`);
    console.log(`  Weight: ${item.portions * (item.dishes.portion_size || 0) / 1000}kg`);
    console.log(`  Created: ${item.created_at}`);
    console.log('');
  });

  // Check for duplicates by meal_type
  const byMealType = {};
  allItems?.forEach(item => {
    if (!byMealType[item.meal_type]) {
      byMealType[item.meal_type] = [];
    }
    byMealType[item.meal_type].push(item);
  });

  console.log('=== DUPLICATES CHECK ===\n');
  let hasDuplicates = false;
  Object.entries(byMealType).forEach(([mealType, items]) => {
    if (items.length > 1) {
      hasDuplicates = true;
      console.log(`⚠️  ${mealType}: ${items.length} items (DUPLICATE!)`);
      items.forEach(item => {
        console.log(`    - ${item.dishes.name}: ${item.portions} portions (created ${item.created_at})`);
      });
    } else {
      console.log(`✓ ${mealType}: 1 item (no duplicates)`);
    }
  });

  if (!hasDuplicates) {
    console.log('\n✓ No duplicates found');
  }

  // Calculate totals by meal_type
  console.log('\n=== TOTALS BY MEAL TYPE ===\n');
  Object.entries(byMealType).forEach(([mealType, items]) => {
    const totalPortions = items.reduce((sum, item) => sum + item.portions, 0);
    console.log(`${mealType}: ${totalPortions} total portions`);
    items.forEach(item => {
      console.log(`  - ${item.dishes.name}: ${item.portions} portions × ${item.dishes.portion_size}g`);
    });
  });
}

checkSnap119Detailed();
