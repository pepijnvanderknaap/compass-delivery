const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://agwheuqqvdtcaqpgviya.supabase.co', 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq');

(async () => {
  const dish = await s.from('dishes').select('name, default_portion_size_ml').ilike('name', 'Mulligatawny').single();
  console.log('Mulligatawny default_portion_size_ml:', dish.data?.default_portion_size_ml);
  
  const orders = await s.from('order_items')
    .select('portions, orders(locations(name, location_settings(soup_portion_size_ml)))')
    .eq('delivery_date', '2026-01-26')
    .eq('meal_type', 'soup');
  
  console.log('\nSoup orders for Monday Jan 26:');
  const grouped = {};
  orders.data?.forEach(item => {
    const loc = item.orders?.locations?.name;
    const portionSize = item.orders?.locations?.location_settings?.[0]?.soup_portion_size_ml;
    if (!grouped[loc]) {
      grouped[loc] = { portions: 0, portionSize };
    }
    grouped[loc].portions += item.portions;
  });
  
  Object.keys(grouped).sort().forEach(loc => {
    const info = grouped[loc];
    const ml = info.portions * (info.portionSize || 150);
    const liters = ml / 1000;
    console.log('  ' + loc + ': ' + info.portions + ' portions x ' + (info.portionSize || 150) + 'ml = ' + liters.toFixed(1) + 'L');
  });
})();
