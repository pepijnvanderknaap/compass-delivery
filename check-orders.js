const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://agwheuqqvdtcaqpgviya.supabase.co', 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq');

(async () => {
  const { data } = await s.from('order_items')
    .select('meal_type, portions, orders(locations(name))')
    .eq('delivery_date', '2026-01-26')
    .order('meal_type');
  
  console.log('Order items for Monday Jan 26:');
  console.log('Total items:', data?.length);
  console.log('');
  
  // Group by location and meal_type
  const grouped = {};
  data?.forEach(item => {
    const loc = item.orders?.locations?.name;
    const meal = item.meal_type;
    if (!grouped[loc]) grouped[loc] = {};
    grouped[loc][meal] = (grouped[loc][meal] || 0) + item.portions;
  });
  
  Object.keys(grouped).sort().forEach(loc => {
    console.log(loc + ':');
    Object.keys(grouped[loc]).sort().forEach(meal => {
      console.log('  ' + meal + ':', grouped[loc][meal]);
    });
  });
})();
