const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://agwheuqqvdtcaqpgviya.supabase.co', 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq');

(async () => {
  const { data: symphony } = await s.from('locations').select('id').ilike('name', 'Symphony').single();
  
  const { data: items } = await s.from('order_items')
    .select('delivery_date, meal_type, portions, orders!inner(location_id)')
    .eq('orders.location_id', symphony.id)
    .gte('delivery_date', '2026-01-26')
    .lte('delivery_date', '2026-01-30')
    .order('delivery_date')
    .order('meal_type');
  
  console.log('Symphony order items for week Jan 26-30:');
  console.log('Total items:', items?.length);
  console.log('Expected: 15 items (3 per day × 5 days)');
  console.log('');
  
  const byDate = {};
  items?.forEach(item => {
    const date = item.delivery_date;
    if (!byDate[date]) byDate[date] = {};
    if (!byDate[date][item.meal_type]) byDate[date][item.meal_type] = [];
    byDate[date][item.meal_type].push(item.portions);
  });
  
  Object.keys(byDate).sort().forEach(date => {
    console.log(date + ':');
    Object.keys(byDate[date]).sort().forEach(meal => {
      const portions = byDate[date][meal];
      console.log('  ' + meal + ': ' + portions.length + ' items = ' + portions.join(' + '));
    });
  });
})();
