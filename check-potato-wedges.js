const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkPotatoWedges() {
  console.log('Checking Potato Wedges usage...\n');

  // Find Potato Wedges
  const { data: potatoWedges } = await supabase
    .from('dishes')
    .select('*')
    .ilike('name', '%potato%wedges%')
    .single();

  if (!potatoWedges) {
    console.log('Potato Wedges not found!');
    return;
  }

  console.log('✅ Potato Wedges found:');
  console.log(`   ID: ${potatoWedges.id}`);
  console.log(`   Category: ${potatoWedges.category}`);
  console.log(`   Subcategory: ${potatoWedges.subcategory}\n`);

  // Find all dishes that use Potato Wedges as a component
  const { data: dishComponents } = await supabase
    .from('dish_components')
    .select('*, main_dish:dishes!main_dish_id(name, category, created_at)')
    .eq('component_dish_id', potatoWedges.id)
    .order('created_at', { ascending: false });

  console.log(`Dishes using Potato Wedges (${dishComponents?.length || 0}):`);
  if (dishComponents && dishComponents.length > 0) {
    dishComponents.forEach(dc => {
      console.log(`   - ${dc.main_dish.name} (${dc.main_dish.category}) - created ${dc.main_dish.created_at}`);
    });
  } else {
    console.log('   (none)');
  }

  // Check most recently created hot dishes
  console.log('\n--- Recently created hot dishes ---');
  const { data: recentHotDishes } = await supabase
    .from('dishes')
    .select('name, category, created_at')
    .in('category', ['hot_dish_meat', 'hot_dish_fish', 'hot_dish_veg'])
    .order('created_at', { ascending: false })
    .limit(5);

  recentHotDishes?.forEach(dish => {
    console.log(`   - ${dish.name} (${dish.category}) - ${dish.created_at}`);
  });
}

checkPotatoWedges();
