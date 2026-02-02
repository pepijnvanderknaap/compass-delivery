import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get all recipes with "Soup" or "soup" in the name
const { data: allRecipes, error: fetchError } = await supabase
  .from('recipes')
  .select('*')
  .ilike('name', '%soup%');

if (fetchError) {
  console.error('Error fetching recipes:', fetchError);
  process.exit(1);
}

console.log(`Found ${allRecipes.length} recipes with "soup" in the name:`);
allRecipes.forEach(r => console.log(`  - ${r.name}`));

if (allRecipes.length === 0) {
  console.log('No soup recipes to delete!');
  process.exit(0);
}

// Delete them
const { error: deleteError } = await supabase
  .from('recipes')
  .delete()
  .in('id', allRecipes.map(r => r.id));

if (deleteError) {
  console.error('Error deleting recipes:', deleteError);
  process.exit(1);
}

console.log(`✅ Successfully deleted ${allRecipes.length} soup recipes!`);
