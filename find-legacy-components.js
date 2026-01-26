const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function findLegacyComponents() {
  console.log('=== WARM VEGGIES & SALADS WITH PORTION SIZES ===\n');

  const { data: warmVeggies } = await supabase
    .from('dishes')
    .select('*')
    .eq('category', 'component')
    .eq('subcategory', 'warm_veggie')
    .order('name');

  console.log('WARM VEGGIES:');
  console.log('-------------');
  if (warmVeggies && warmVeggies.length > 0) {
    warmVeggies.forEach(dish => {
      const hasPortionSize = dish.portion_size !== null && dish.portion_size !== undefined;
      console.log(dish.name + ' (ID: ' + dish.id + ')');
      console.log('  Portion: ' + (dish.portion_size || 'NONE') + ' ' + (dish.portion_unit || ''));
      console.log('  Has portion size: ' + (hasPortionSize ? 'YES ⚠️' : 'NO ✓'));
      console.log('');
    });
  } else {
    console.log('  None found\n');
  }

  const { data: salads } = await supabase
    .from('dishes')
    .select('*')
    .eq('category', 'component')
    .eq('subcategory', 'salad')
    .order('name');

  console.log('\nSALADS:');
  console.log('-------');
  if (salads && salads.length > 0) {
    salads.forEach(dish => {
      const hasPortionSize = dish.portion_size !== null && dish.portion_size !== undefined;
      console.log(dish.name + ' (ID: ' + dish.id + ')');
      console.log('  Portion: ' + (dish.portion_size || 'NONE') + ' ' + (dish.portion_unit || ''));
      console.log('  Has portion size: ' + (hasPortionSize ? 'YES ⚠️' : 'NO ✓'));
      console.log('');
    });
  } else {
    console.log('  None found\n');
  }

  const warmVeggiesWithPortions = warmVeggies?.filter(d => d.portion_size !== null && d.portion_size !== undefined) || [];
  const saladsWithPortions = salads?.filter(d => d.portion_size !== null && d.portion_size !== undefined) || [];
  
  console.log('\n=== SUMMARY ===');
  console.log('Warm Veggies with portion sizes: ' + warmVeggiesWithPortions.length);
  console.log('Salads with portion sizes: ' + saladsWithPortions.length);
  console.log('Total components needing cleanup: ' + (warmVeggiesWithPortions.length + saladsWithPortions.length));
}

findLegacyComponents();
