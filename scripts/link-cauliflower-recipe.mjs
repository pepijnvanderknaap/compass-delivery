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

console.log('=== LINKING CAULIFLOWER SOUP RECIPE TO DISH ===\n');

// 1. Find the Cauliflower Soup dish
const { data: dishes, error: dishError } = await supabase
  .from('dishes')
  .select('*')
  .ilike('name', '%cauliflower%soup%');

if (dishError) {
  console.error('Error fetching dishes:', dishError);
  process.exit(1);
}

console.log('Found dishes:', dishes?.length || 0);
dishes?.forEach(d => {
  console.log(`  - ID: ${d.id}, Name: ${d.name}, Category: ${d.category}`);
});

// 2. Find the Cauliflower Soup recipe
const { data: recipes, error: recipeError } = await supabase
  .from('recipes')
  .select('*')
  .ilike('name', '%cauliflower%soup%');

if (recipeError) {
  console.error('Error fetching recipes:', recipeError);
  process.exit(1);
}

console.log('\nFound recipes:', recipes?.length || 0);
recipes?.forEach(r => {
  console.log(`  - ID: ${r.id}, Name: ${r.name}, Current dish_id: ${r.dish_id || 'NULL'}`);
});

// 3. Link them if we found exactly one of each
if (dishes?.length === 1 && recipes?.length === 1) {
  const dish = dishes[0];
  const recipe = recipes[0];

  console.log(`\nLinking recipe "${recipe.name}" to dish "${dish.name}"...`);

  const { error: updateError } = await supabase
    .from('recipes')
    .update({ dish_id: dish.id })
    .eq('id', recipe.id);

  if (updateError) {
    console.error('Error updating recipe:', updateError);
    process.exit(1);
  }

  console.log('✅ SUCCESS! Recipe linked to dish.');
  console.log(`   Recipe: ${recipe.name} (ID: ${recipe.id})`);
  console.log(`   Dish: ${dish.name} (ID: ${dish.id})`);
} else {
  console.log('\n⚠️  Could not auto-link:');
  if (dishes?.length !== 1) {
    console.log(`   - Expected 1 dish, found ${dishes?.length || 0}`);
  }
  if (recipes?.length !== 1) {
    console.log(`   - Expected 1 recipe, found ${recipes?.length || 0}`);
  }
}
