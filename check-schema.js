const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkSchema() {
  console.log('=== CHECKING TABLE SCHEMAS ===\n');

  const { data: saladSample } = await supabase
    .from('salad_components')
    .select('*')
    .limit(1);

  console.log('SALAD_COMPONENTS columns:');
  if (saladSample && saladSample.length > 0) {
    console.log(Object.keys(saladSample[0]).join(', '));
    console.log('\nSample data:', saladSample[0]);
  } else {
    console.log('No data found');
  }

  const { data: veggeSample } = await supabase
    .from('warm_veggie_components')
    .select('*')
    .limit(1);

  console.log('\n\nWARM_VEGGIE_COMPONENTS columns:');
  if (veggeSample && veggeSample.length > 0) {
    console.log(Object.keys(veggeSample[0]).join(', '));
    console.log('\nSample data:', veggeSample[0]);
  } else {
    console.log('No data found');
  }
}

checkSchema();
