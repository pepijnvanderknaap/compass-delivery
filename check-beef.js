const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkBeefBolognese() {
  console.log('Checking Beef Bolognese components...\n');

  const { data: dish } = await supabase
    .from('dishes')
    .select('*')
    .ilike('name', '%beef%bolognese%')
    .single();

  if (!dish) {
    console.log('Dish not found!');
    return;
  }

  console.log('✅ Dish found:');
  console.log(`   ID: ${dish.id}`);
  console.log(`   Name: ${dish.name}\n`);

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

  // Check old-style dish_components
  const { data: oldComponents } = await supabase
    .from('dish_components')
    .select('component_type, component_dish:dishes!component_dish_id(name)')
    .eq('main_dish_id', dish.id)
    .eq('component_type', 'warm_veggie');

  console.log(`\nOld-style warm_veggie links (${oldComponents?.length || 0}):`);
  if (oldComponents && oldComponents.length > 0) {
    oldComponents.forEach(comp => {
      console.log(`   - ${comp.component_dish.name}`);
    });
  } else {
    console.log('   (none)');
  }
}

checkBeefBolognese();
