const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkLentilBolognese() {
  console.log('Checking Lentil Bolognese components...\n');

  // Find the dish
  const { data: dish } = await supabase
    .from('dishes')
    .select('*')
    .ilike('name', 'Lentil Bolognese')
    .single();

  if (!dish) {
    console.log('Dish not found!');
    return;
  }

  console.log('✅ Dish found:');
  console.log(`   ID: ${dish.id}`);
  console.log(`   Name: ${dish.name}`);
  console.log(`   Category: ${dish.category}\n`);

  // Check salad components
  const { data: saladComponents } = await supabase
    .from('salad_components')
    .select('*, component_dish:dishes!component_dish_id(name)')
    .eq('main_dish_id', dish.id);

  console.log(`Salad Components (${saladComponents?.length || 0}):`);
  if (saladComponents && saladComponents.length > 0) {
    saladComponents.forEach(sc => {
      console.log(`   - ${sc.component_dish.name}: ${sc.percentage}%`);
    });
  } else {
    console.log('   (none)');
  }

  // Check warm veggie components
  const { data: warmVeggieComponents } = await supabase
    .from('warm_veggie_components')
    .select('*, component_dish:dishes!component_dish_id(name)')
    .eq('main_dish_id', dish.id);

  console.log(`\nWarm Veggie Components (${warmVeggieComponents?.length || 0}):`);
  if (warmVeggieComponents && warmVeggieComponents.length > 0) {
    warmVeggieComponents.forEach(wv => {
      console.log(`   - ${wv.component_dish.name}: ${wv.percentage}%`);
    });
  } else {
    console.log('   (none)');
  }

  // Summary
  const saladTotal = saladComponents?.reduce((sum, sc) => sum + Number(sc.percentage), 0) || 0;
  const warmVeggieTotal = warmVeggieComponents?.reduce((sum, wv) => sum + Number(wv.percentage), 0) || 0;

  console.log('\nTotals:');
  console.log(`   Salad: ${saladTotal}%`);
  console.log(`   Warm Veggies: ${warmVeggieTotal}%`);

  if (saladComponents?.length === 0 && warmVeggieComponents?.length === 0) {
    console.log('\n⚠️  The dish has no components saved!');
    console.log('   You may need to edit the dish and add them manually or use "Copy from..."');
  }
}

checkLentilBolognese();
