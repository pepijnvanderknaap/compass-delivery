import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

dotenv.config({ path: join(projectRoot, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== ALL DISHES ===\n');

const { data: allDishes, error: dishError } = await supabase
  .from('dishes')
  .select('id, name, category')
  .order('name');

if (dishError) {
  console.error('Error fetching dishes:', dishError);
} else {
  console.log(`Total dishes: ${allDishes?.length || 0}\n`);
  allDishes?.forEach(d => {
    console.log(`ID: ${d.id}`);
    console.log(`Name: ${d.name}`);
    console.log(`Category: ${d.category}`);
    console.log('---');
  });
}

console.log('\n=== ALL RECIPES ===\n');

const { data: allRecipes, error: recipeError } = await supabase
  .from('recipes')
  .select('id, name, dish_id')
  .order('name');

if (recipeError) {
  console.error('Error fetching recipes:', recipeError);
} else {
  console.log(`Total recipes: ${allRecipes?.length || 0}\n`);
  allRecipes?.forEach(r => {
    console.log(`ID: ${r.id}`);
    console.log(`Name: ${r.name}`);
    console.log(`dish_id: ${r.dish_id || 'NULL'}`);
    console.log('---');
  });
}
