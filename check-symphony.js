const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://agwheuqqvdtcaqpgviya.supabase.co', 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq');

(async () => {
  // Get Symphony location
  const { data: symphony } = await s.from('locations').select('id, name').ilike('name', 'Symphony').single();
  console.log('Symphony location:', symphony);
  
  // Get all order_items for Symphony on Monday
  const { data: items } = await s.from('order_items')
    .select('id, portions, meal_type, orders!inner(location_id)')
    .eq('orders.location_id', symphony.id)
    .eq('delivery_date', '2026-01-26');
  
  console.log('\nSymphony order items for Monday Jan 26:');
  console.log('Total items:', items?.length);
  
  const byMealType = {};
  items?.forEach(item => {
    if (!byMealType[item.meal_type]) byMealType[item.meal_type] = [];
    byMealType[item.meal_type].push(item.portions);
  });
  
  Object.keys(byMealType).sort().forEach(meal => {
    const portions = byMealType[meal];
    const total = portions.reduce((a, b) => a + b, 0);
    console.log('  ' + meal + ': ' + portions.length + ' items, portions: ' + portions.join(' + ') + ' = ' + total);
  });
})();
