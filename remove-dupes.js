const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function removeDuplicates() {
  console.log('Finding Lentil Bolognese dishes...\n');

  // Find all Lentil Bolognese dishes
  const { data: dishes, error } = await supabase
    .from('dishes')
    .select('*')
    .ilike('name', '%lentil%bolognese%')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error finding dishes:', error);
    return;
  }

  console.log(`Found ${dishes.length} "Lentil Bolognese" dishes:\n`);
  dishes.forEach((dish, index) => {
    console.log(`${index + 1}. ID: ${dish.id}`);
    console.log(`   Name: ${dish.name}`);
    console.log(`   Created: ${dish.created_at}`);
    console.log(`   Category: ${dish.category}\n`);
  });

  if (dishes.length <= 1) {
    console.log('No duplicates found!');
    return;
  }

  // Keep the first one (oldest), delete the rest
  const toKeep = dishes[0];
  const toDelete = dishes.slice(1);

  console.log(`Keeping: ${toKeep.name} (ID: ${toKeep.id}, created ${toKeep.created_at})`);
  console.log(`\nDeleting ${toDelete.length} duplicate(s)...\n`);

  for (const dish of toDelete) {
    const { error: deleteError } = await supabase
      .from('dishes')
      .delete()
      .eq('id', dish.id);

    if (deleteError) {
      console.error(`❌ Failed to delete ${dish.id}:`, deleteError.message);
    } else {
      console.log(`✅ Deleted: ${dish.name} (ID: ${dish.id})`);
    }
  }

  console.log('\n✅ Done! Only one "Lentil Bolognese" remains in the database.');
}

removeDuplicates();
