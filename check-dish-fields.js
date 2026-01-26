const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkDishFields() {
  const { data } = await supabase
    .from('dishes')
    .select('*')
    .eq('category', 'hot_dish_meat')
    .limit(1);

  console.log('DISHES table columns:');
  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    columns.forEach(col => {
      console.log('  ' + col + ': ' + (data[0][col] !== null ? typeof data[0][col] : 'null'));
    });
  }
}

checkDishFields();
