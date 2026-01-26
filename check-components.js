const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkComponents() {
  console.log('Checking component systems...\n');

  // Check dish_components table
  console.log('1. Checking dish_components (old system):');
  const { data: dishComponents, error: dcError } = await supabase
    .from('dish_components')
    .select('component_type')
    .eq('component_type', 'warm_veggie')
    .limit(5);

  if (dcError) {
    console.log('   ❌ Error:', dcError.message);
  } else {
    console.log(`   ✅ Found ${dishComponents.length} warm_veggie entries in dish_components`);
  }

  // Check warm_veggie_components table (new system)
  console.log('\n2. Checking warm_veggie_components (new percentage-based system):');
  const { data: wvComponents, error: wvError } = await supabase
    .from('warm_veggie_components')
    .select('*')
    .limit(5);

  if (wvError) {
    console.log('   ❌ Error:', wvError.message);
    console.log('   Code:', wvError.code);
  } else {
    console.log(`   ✅ Found ${wvComponents.length} entries in warm_veggie_components`);
  }

  // Check salad_components table (percentage-based)
  console.log('\n3. Checking salad_components (percentage-based system):');
  const { data: saladComponents, error: scError } = await supabase
    .from('salad_components')
    .select('*')
    .limit(5);

  if (scError) {
    console.log('   ❌ Error:', scError.message);
    console.log('   Code:', scError.code);
  } else {
    console.log(`   ✅ Found ${saladComponents.length} entries in salad_components`);
    if (saladComponents.length > 0) {
      console.log('   Sample:', JSON.stringify(saladComponents[0], null, 2));
    }
  }
}

checkComponents();
