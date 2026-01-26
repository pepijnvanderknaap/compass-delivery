const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkCategories() {
  console.log('Checking dish categories...\n');

  // Get all unique categories
  const { data: allDishes } = await supabase
    .from('dishes')
    .select('category')
    .not('category', 'is', null);

  const categories = [...new Set(allDishes?.map(d => d.category))].sort();

  console.log('All categories in database:');
  categories.forEach(cat => {
    console.log(`   - ${cat}`);
  });

  // Check Lentil Bolognese specifically
  const { data: lentil } = await supabase
    .from('dishes')
    .select('*')
    .ilike('name', 'Lentil Bolognese')
    .single();

  if (lentil) {
    console.log(`\n✅ Lentil Bolognese category: "${lentil.category}"`);
  }

  // Check Beef Bolognese
  const { data: beef } = await supabase
    .from('dishes')
    .select('*')
    .ilike('name', 'Beef Bolognese')
    .single();

  if (beef) {
    console.log(`✅ Beef Bolognese category: "${beef.category}"`);
  }

  // Check what other hot veg dishes have
  const { data: hotVegDishes } = await supabase
    .from('dishes')
    .select('name, category')
    .like('category', '%veg%')
    .order('name')
    .limit(10);

  console.log('\nOther vegetarian dishes and their categories:');
  hotVegDishes?.forEach(dish => {
    console.log(`   - ${dish.name}: "${dish.category}"`);
  });
}

checkCategories();
