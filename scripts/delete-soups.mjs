import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get all recipes
const { data: allRecipes, error: fetchError } = await supabase
  .from('recipes')
  .select('*, dishes(category)');

if (fetchError) {
  console.error('Error fetching recipes:', fetchError);
  process.exit(1);
}

const soupRecipes = allRecipes.filter(r => r.dishes?.category === 'soup');

console.log(`Found ${soupRecipes.length} soup recipes to delete:`);
soupRecipes.forEach(r => console.log(`  - ${r.name}`));

if (soupRecipes.length === 0) {
  console.log('No soup recipes to delete!');
  process.exit(0);
}

// Delete them
const { error: deleteError } = await supabase
  .from('recipes')
  .delete()
  .in('id', soupRecipes.map(r => r.id));

if (deleteError) {
  console.error('Error deleting recipes:', deleteError);
  process.exit(1);
}

console.log(`Successfully deleted ${soupRecipes.length} soup recipes!`);
