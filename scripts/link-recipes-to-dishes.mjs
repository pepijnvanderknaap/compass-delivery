import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

dotenv.config({ path: join(projectRoot, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

console.log('=== LINKING RECIPES TO DISHES ===\n');

// Get all recipes
const { data: recipes } = await supabase
  .from('recipes')
  .select('*')
  .order('name');

console.log(`Found ${recipes?.length || 0} recipes:\n`);

for (const recipe of recipes || []) {
  console.log(`Recipe: "${recipe.name}"`);
  console.log(`  Current dish_id: ${recipe.dish_id || 'NULL'}`);

  // Try to find a matching dish by name
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, name, category')
    .ilike('name', `%${recipe.name}%`);

  if (dishes && dishes.length > 0) {
    console.log(`  Found ${dishes.length} potential dish matches:`);
    dishes.forEach(d => {
      console.log(`    - "${d.name}" (${d.category}) - ID: ${d.id}`);
    });

    // If exactly one match, offer to link
    if (dishes.length === 1) {
      const dish = dishes[0];
      console.log(`  ✅ Auto-linking to "${dish.name}"`);

      const { error } = await supabase
        .from('recipes')
        .update({ dish_id: dish.id })
        .eq('id', recipe.id);

      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  ✅ Linked successfully!`);
      }
    }
  } else {
    console.log(`  ⚠️  No matching dish found`);
  }
  console.log('');
}

// Show final status
console.log('\n=== FINAL STATUS ===\n');
const { data: updatedRecipes } = await supabase
  .from('recipes')
  .select('name, dish_id')
  .order('name');

updatedRecipes?.forEach(r => {
  console.log(`${r.name}: ${r.dish_id ? '✅ Linked' : '❌ Not linked'}`);
});
