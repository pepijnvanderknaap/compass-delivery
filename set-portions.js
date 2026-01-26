const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setPortions() {
  // Beef Burger - 140g
  const r1 = await supabase.from('dishes').update({default_portion_size_g: 140}).ilike('name', 'Beef Burger');
  console.log('Beef Burger:', r1.error ? r1.error.message : 'Set to 140g');

  // Mixed Veg Biryani - 280g
  const r2 = await supabase.from('dishes').update({default_portion_size_g: 280}).ilike('name', 'Mixed Veg Biryani');
  console.log('Mixed Veg Biryani:', r2.error ? r2.error.message : 'Set to 280g');

  // Potato Wedges - 150g
  const r3 = await supabase.from('dishes').update({default_portion_size_g: 150}).ilike('name', 'Potato Wedges');
  console.log('Potato Wedges:', r3.error ? r3.error.message : 'Set to 150g');
}

setPortions();
