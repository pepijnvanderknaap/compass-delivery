const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function backfillMealType() {
  console.log('Fetching order_items without meal_type...');
  
  // Get all order_items with their dish category
  const { data: items, error } = await supabase
    .from('order_items')
    .select('id, dish_id, dishes(category)')
    .is('meal_type', null);

  if (error) {
    console.error('Error fetching items:', error);
    return;
  }

  console.log(`Found ${items.length} items without meal_type`);

  // Map category to meal_type
  const categoryToMealType = {
    'soup': 'soup',
    'hot_dish_meat': 'hot_meat',
    'hot_dish_fish': 'hot_fish',
    'hot_dish_veg': 'hot_veg'
  };

  let updated = 0;
  for (const item of items) {
    const category = item.dishes?.category;
    const mealType = categoryToMealType[category];

    if (mealType) {
      const { error: updateError } = await supabase
        .from('order_items')
        .update({ meal_type: mealType })
        .eq('id', item.id);

      if (updateError) {
        console.error(`Error updating item ${item.id}:`, updateError);
      } else {
        updated++;
        if (updated % 50 === 0) {
          console.log(`Updated ${updated} items...`);
        }
      }
    } else {
      console.warn(`Unknown category for item ${item.id}: ${category}`);
    }
  }

  console.log(`\nBackfill complete! Updated ${updated} items`);
}

backfillMealType();
