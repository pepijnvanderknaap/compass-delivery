import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteDuplicateVeggieLoafs() {
  // First, let's see all dishes
  const { data: allDishes, error: allError } = await supabase
    .from('dishes')
    .select('id, name, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (allError) {
    console.error('Error fetching all dishes:', allError);
    return;
  } else {
    console.log(`\nRecent dishes (${allDishes?.length || 0} found):`);
    if (allDishes && allDishes.length > 0) {
      allDishes.forEach(d => console.log(`- ${d.name} (${d.created_at})`));
    } else {
      console.log('No dishes found - check RLS policies or auth');
    }
  }

  // Find all Veggie Lentil Loaf dishes
  const { data: dishes, error } = await supabase
    .from('dishes')
    .select('*')
    .ilike('name', '%veggie%loaf%')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching dishes:', error);
    return;
  }

  console.log(`Found ${dishes.length} Veggie Lentil Loaf dishes:`);
  dishes.forEach((dish, i) => {
    console.log(`${i + 1}. ID: ${dish.id}, Name: ${dish.name}, Created: ${dish.created_at}`);
  });

  if (dishes.length >= 3) {
    // Delete the 2 oldest (first 2 in the array since we sorted by created_at ascending)
    const toDelete = dishes.slice(0, 2);

    console.log('\nDeleting 2 oldest:');
    for (const dish of toDelete) {
      console.log(`Deleting: ${dish.name} (${dish.id}) from ${dish.created_at}`);

      const { error: deleteError } = await supabase
        .from('dishes')
        .delete()
        .eq('id', dish.id);

      if (deleteError) {
        console.error(`Error deleting ${dish.id}:`, deleteError);
      } else {
        console.log(`✓ Deleted ${dish.id}`);
      }
    }
  } else {
    console.log('\nLess than 3 duplicates found, not deleting anything.');
  }
}

deleteDuplicateVeggieLoafs();
