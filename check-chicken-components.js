const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkChickenComponents() {
  console.log('Checking Chicken Biryani components...\n');

  // Get Chicken Biryani dish
  const { data: dish } = await supabase
    .from('dishes')
    .select('*')
    .ilike('name', '%Chicken Biryani%')
    .single();

  console.log(`Dish: ${dish.name}`);
  console.log(`ID: ${dish.id}`);
  console.log(`Category: ${dish.category}`);
  console.log(`Portion size: ${dish.portion_size}g`);
  console.log(`Main dish portion size: ${dish.main_dish_portion_size_g}g`);
  console.log(`Naan bread portion size: ${dish.naan_bread_portion_size_g}g`);
  console.log(`Cucumber raita portion size: ${dish.cucumber_raita_portion_size_g}g`);
  console.log(`Salad total portion: ${dish.salad_total_portion_g}g`);
  console.log(`Warm veggie total portion: ${dish.warm_veggie_total_portion_g}g\n`);

  // Get components
  const { data: components } = await supabase
    .from('dish_components')
    .select('*, component_dish:dishes!component_dish_id(*)')
    .eq('main_dish_id', dish.id);

  console.log(`Components (${components?.length || 0}):\n`);
  components?.forEach(comp => {
    console.log(`  ${comp.component_type}: ${comp.component_dish.name}`);
    console.log(`    Percentage: ${comp.percentage}%`);
    console.log(`    Component portion size: ${comp.component_dish.portion_size}g`);
    console.log('');
  });

  // Calculate what 65 portions would be
  console.log('=== CALCULATION FOR 65 PORTIONS ===\n');
  console.log(`Main dish: 65 × ${dish.portion_size}g = ${65 * dish.portion_size / 1000}kg`);

  if (dish.main_dish_portion_size_g) {
    console.log(`  (using main_dish_portion_size_g: 65 × ${dish.main_dish_portion_size_g}g = ${65 * dish.main_dish_portion_size_g / 1000}kg)`);
  }

  if (components && components.length > 0) {
    console.log('\nComponents:');
    components.forEach(comp => {
      if (comp.percentage && dish.main_dish_portion_size_g) {
        const componentGrams = (dish.main_dish_portion_size_g * comp.percentage) / 100;
        const totalGrams = 65 * componentGrams;
        console.log(`  ${comp.component_dish.name}: 65 × ${componentGrams}g = ${totalGrams / 1000}kg`);
      }
    });
  }

  // Check if there's something that would give us 2kg extra
  console.log('\n=== FINDING 2KG DISCREPANCY ===\n');
  console.log(`Expected: 65 × 320g = 20.8kg`);
  console.log(`Showing: 22.8kg`);
  console.log(`Difference: 2kg`);
  console.log(`\n2kg = 2000g`);
  console.log(`2000g ÷ 65 portions = ${2000 / 65}g per portion extra`);
}

checkChickenComponents();
