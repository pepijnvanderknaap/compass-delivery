const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://agwheuqqvdtcaqpgviya.supabase.co', 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq');

(async () => {
  // First check how many hot_fish items exist
  const { data: fishItems } = await s.from('order_items').select('id').eq('meal_type', 'hot_fish');
  console.log('Found', fishItems?.length, 'hot_fish items');
  
  // Convert all hot_fish to hot_meat
  const { error } = await s.from('order_items').update({ meal_type: 'hot_meat' }).eq('meal_type', 'hot_fish');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Successfully converted all hot_fish to hot_meat');
  }
  
  // Verify
  const { data: remaining } = await s.from('order_items').select('id').eq('meal_type', 'hot_fish');
  console.log('Remaining hot_fish items:', remaining?.length || 0);
})();
