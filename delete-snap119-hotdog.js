const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function deleteSnap119HotDog() {
  console.log('Deleting Hot Dog order_item for SnapChat 119 on Monday Jan 26...\n');

  // Delete the specific order_item
  const { error } = await supabase
    .from('order_items')
    .delete()
    .eq('id', '068679fc-b2af-48c6-9f45-24fa5bb2d710');

  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log('✓ Successfully deleted Hot Dog order_item');
    console.log('  Now you can re-enter 65 in the UI and it will create the correct Chicken Biryani order_item');
  }
}

deleteSnap119HotDog();
