const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function deleteLentilBolognese() {
  console.log('Deleting Lentil Bolognese...\n');

  const { data: dish } = await supabase
    .from('dishes')
    .select('*')
    .ilike('name', 'Lentil Bolognese')
    .single();

  if (!dish) {
    console.log('Dish not found!');
    return;
  }

  console.log('Found dish:');
  console.log(`   ID: ${dish.id}`);
  console.log(`   Name: ${dish.name}\n`);

  const { error } = await supabase
    .from('dishes')
    .delete()
    .eq('id', dish.id);

  if (error) {
    console.error('❌ Failed to delete:', error.message);
  } else {
    console.log('✅ Successfully deleted Lentil Bolognese');
    console.log('\nYou can now create it fresh with the "Copy from..." feature!');
  }
}

deleteLentilBolognese();
