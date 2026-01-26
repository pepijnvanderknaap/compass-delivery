const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function searchWedges() {
  console.log('Searching for anything with "wedge"...\n');

  const { data: dishes } = await supabase
    .from('dishes')
    .select('*')
    .ilike('name', '%wedge%');

  console.log(`Found ${dishes?.length || 0} dishes:`);
  if (dishes && dishes.length > 0) {
    dishes.forEach(dish => {
      console.log(`   - ${dish.name} (${dish.category}, subcategory: ${dish.subcategory})`);
    });
  }

  // Also search for anything with "potato"
  console.log('\n\nSearching for anything with "potato"...\n');

  const { data: potatoDishes } = await supabase
    .from('dishes')
    .select('*')
    .ilike('name', '%potato%');

  console.log(`Found ${potatoDishes?.length || 0} dishes:`);
  if (potatoDishes && potatoDishes.length > 0) {
    potatoDishes.forEach(dish => {
      console.log(`   - ${dish.name} (${dish.category}, subcategory: ${dish.subcategory})`);
    });
  }
}

searchWedges();
