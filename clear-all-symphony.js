const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://agwheuqqvdtcaqpgviya.supabase.co', 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq');

(async () => {
  // Get Symphony location
  const { data: symphony } = await s.from('locations').select('id').ilike('name', 'Symphony').single();
  console.log('Symphony location ID:', symphony.id);
  
  // Get all Symphony orders
  const { data: orders } = await s.from('orders').select('id').eq('location_id', symphony.id);
  console.log('Symphony has', orders?.length, 'order records (weeks)');
  
  if (orders && orders.length > 0) {
    const orderIds = orders.map(o => o.id);
    
    // Delete ALL order_items for Symphony
    const { error, count } = await s.from('order_items')
      .delete()
      .in('order_id', orderIds);
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Successfully deleted ALL Symphony order items');
    }
  }
  
  // Verify
  const { data: remaining } = await s.from('order_items')
    .select('id, order_id')
    .in('order_id', orders?.map(o => o.id) || []);
  
  console.log('Remaining Symphony order_items:', remaining?.length || 0);
})();
