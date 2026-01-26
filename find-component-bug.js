const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function findComponentBug() {
  console.log('Finding component bug in Chicken Biryani calculation...\n');

  // Get Chicken Biryani
  const { data: dish } = await supabase
    .from('dishes')
    .select('*')
    .ilike('name', '%Chicken Biryani%')
    .single();

  console.log(`Main dish: ${dish.name}`);
  console.log(`  portion_size: ${dish.portion_size}g`);
  console.log(`  main_dish_portion_size_g: ${dish.main_dish_portion_size_g}g`);
  console.log(`  naan_bread_portion_size_g: ${dish.naan_bread_portion_size_g}g`);
  console.log(`  cucumber_raita_portion_size_g: ${dish.cucumber_raita_portion_size_g}g`);
  console.log(`  salad_total_portion_g: ${dish.salad_total_portion_g}g`);
  console.log(`  warm_veggie_total_portion_g: ${dish.warm_veggie_total_portion_g}g\n`);

  // Get components
  const { data: components } = await supabase
    .from('dish_components')
    .select('*, component_dish:dishes!component_dish_id(*)')
    .eq('main_dish_id', dish.id);

  console.log(`Components attached to Chicken Biryani: ${components?.length || 0}\n`);

  components?.forEach(comp => {
    console.log(`  ${comp.component_type}: ${comp.component_dish.name}`);
    console.log(`    Component portion_size: ${comp.component_dish.portion_size}g`);
    console.log(`    Percentage: ${comp.percentage}%`);
    console.log('');
  });

  // Calculate using the different portion size fields
  console.log('=== CALCULATION POSSIBILITIES FOR 65 PORTIONS ===\n');

  console.log('1. Using portion_size field:');
  console.log(`   65 × ${dish.portion_size}g = ${65 * dish.portion_size / 1000}kg`);

  if (dish.main_dish_portion_size_g) {
    console.log('\n2. Using main_dish_portion_size_g field:');
    console.log(`   65 × ${dish.main_dish_portion_size_g}g = ${65 * dish.main_dish_portion_size_g / 1000}kg`);
  }

  if (dish.naan_bread_portion_size_g) {
    console.log('\n3. If naan_bread_portion_size_g is being added:');
    console.log(`   65 × (${dish.portion_size}g + ${dish.naan_bread_portion_size_g}g) = ${65 * (dish.portion_size + dish.naan_bread_portion_size_g) / 1000}kg`);
  }

  if (dish.cucumber_raita_portion_size_g) {
    console.log('\n4. If cucumber_raita_portion_size_g is being added:');
    console.log(`   65 × (${dish.portion_size}g + ${dish.cucumber_raita_portion_size_g}g) = ${65 * (dish.portion_size + dish.cucumber_raita_portion_size_g) / 1000}kg`);
  }

  if (dish.salad_total_portion_g) {
    console.log('\n5. If salad_total_portion_g is being added:');
    console.log(`   65 × (${dish.portion_size}g + ${dish.salad_total_portion_g}g) = ${65 * (dish.portion_size + dish.salad_total_portion_g) / 1000}kg`);
  }

  // Try to find what gives 22.8kg
  console.log('\n=== REVERSE ENGINEERING 22.8KG ===\n');
  console.log('22.8kg ÷ 65 portions = 350.77g per portion');
  console.log(`That's ${350.77 - dish.portion_size}g more than portion_size (${dish.portion_size}g)`);
  console.log('\nWhat could add ~31g per portion?');

  // Check all the special portion fields
  const extraFields = [
    { name: 'main_dish_portion_size_g', value: dish.main_dish_portion_size_g },
    { name: 'naan_bread_portion_size_g', value: dish.naan_bread_portion_size_g },
    { name: 'cucumber_raita_portion_size_g', value: dish.cucumber_raita_portion_size_g },
    { name: 'salad_total_portion_g', value: dish.salad_total_portion_g },
    { name: 'warm_veggie_total_portion_g', value: dish.warm_veggie_total_portion_g }
  ];

  extraFields.forEach(field => {
    if (field.value) {
      console.log(`  ${field.name}: ${field.value}g → would give ${65 * (dish.portion_size + field.value) / 1000}kg`);
    }
  });
}

findComponentBug();
