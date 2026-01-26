const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkColeslaw() {
  console.log('Checking Indian Coleslaw component for Chicken Biryani...\n');

  // Get Chicken Biryani
  const { data: chickenBiryani } = await supabase
    .from('dishes')
    .select('id, name, portion_size, salad_total_portion_g')
    .ilike('name', '%Chicken Biryani%')
    .single();

  console.log(`Main dish: ${chickenBiryani.name}`);
  console.log(`  Main portion size: ${chickenBiryani.portion_size}g`);
  console.log(`  Salad total portion: ${chickenBiryani.salad_total_portion_g}g\n`);

  // Get all components for Chicken Biryani
  const { data: components } = await supabase
    .from('dish_components')
    .select('*, component_dish:dishes!component_dish_id(id, name, portion_size, subcategory)')
    .eq('main_dish_id', chickenBiryani.id);

  console.log(`All components (${components?.length || 0}):\n`);
  components?.forEach(comp => {
    console.log(`  Component type: ${comp.component_type}`);
    console.log(`  Dish: ${comp.component_dish.name}`);
    console.log(`  Subcategory: ${comp.component_dish.subcategory}`);
    console.log(`  Portion size: ${comp.component_dish.portion_size}g`);
    console.log(`  Percentage: ${comp.percentage}%`);
    console.log('');
  });

  // Look specifically for salad type components
  const saladComponents = components?.filter(c => c.component_type === 'salad') || [];
  console.log(`=== SALAD COMPONENTS ===\n`);
  console.log(`Found ${saladComponents.length} salad component(s)\n`);

  saladComponents.forEach(comp => {
    console.log(`  ${comp.component_dish.name}:`);
    console.log(`    Percentage: ${comp.percentage}%`);
    console.log(`    Component portion size: ${comp.component_dish.portion_size}g`);

    // Calculate based on percentage of salad_total_portion_g
    if (comp.percentage && chickenBiryani.salad_total_portion_g) {
      const componentGrams = (chickenBiryani.salad_total_portion_g * comp.percentage) / 100;
      console.log(`    Calculated per portion: ${chickenBiryani.salad_total_portion_g}g × ${comp.percentage}% = ${componentGrams}g`);
      console.log(`    For 65 portions: 65 × ${componentGrams}g = ${65 * componentGrams / 1000}kg`);
    }
    console.log('');
  });

  // Check if 2kg could be explained
  console.log('=== DISCREPANCY ANALYSIS ===\n');
  console.log('Expected Chicken Biryani only: 65 × 320g = 20.8kg');
  console.log('Actual showing: 22.8kg');
  console.log('Difference: 2kg\n');

  if (saladComponents.length > 0) {
    const totalSaladWeight = saladComponents.reduce((sum, comp) => {
      if (comp.percentage && chickenBiryani.salad_total_portion_g) {
        const componentGrams = (chickenBiryani.salad_total_portion_g * comp.percentage) / 100;
        return sum + (65 * componentGrams / 1000);
      }
      return sum;
    }, 0);

    console.log(`Total salad component weight for 65 portions: ${totalSaladWeight}kg`);
    console.log(`Main dish + salad: ${20.8 + totalSaladWeight}kg`);
  }
}

checkColeslaw();
