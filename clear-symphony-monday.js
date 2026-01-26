const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://agwheuqqvdtcaqpgviya.supabase.co', 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq');

(async () => {
  // Get Symphony location
  const { data: symphony } = await s.from('locations').select('id').ilike('name', 'Symphony').single();
  
  // Get Symphony's orders
  const { data: orders } = await s.from('orders').select('id').eq('location_id', symphony.id);
  const orderIds = orders.map(o => o.id);
  
  // Delete all Symphony order_items for Monday Jan 26
  const { error } = await s.from('order_items')
    .delete()
    .eq('delivery_date', '2026-01-26')
    .in('order_id', orderIds);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Cleared all Symphony orders for Monday Jan 26');
  }
})();
