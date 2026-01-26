const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifySnap119() {
  console.log('Verifying SnapChat 119 order items for week Jan 26-30, 2026...\n');

  // Get Snapchat 119 location ID
  const { data: location } = await supabase
    .from('locations')
    .select('id')
    .eq('name', 'SnapChat 119')
    .single();

  console.log(`Location ID: ${location.id}\n`);

  // Get order ID for week starting Jan 26
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('location_id', location.id)
    .eq('week_start_date', '2026-01-26')
    .single();

  console.log(`Order ID: ${order.id}\n`);

  // Get all order items for this week
  const { data: items } = await supabase
    .from('order_items')
    .select('id, delivery_date, portions, meal_type, dishes(name, category)')
    .eq('order_id', order.id)
    .order('delivery_date')
    .order('meal_type');

  console.log(`Total order items: ${items?.length}\n`);

  // Group by date and meal type
  const byDate = {};
  items?.forEach(item => {
    if (!byDate[item.delivery_date]) {
      byDate[item.delivery_date] = {};
    }
    byDate[item.delivery_date][item.meal_type] = {
      portions: item.portions,
      dish: item.dishes?.name
    };
  });

  // Display in table format
  console.log('Date          | Soup                    | Hot Meat                | Hot Veg');
  console.log('------------- | ----------------------- | ----------------------- | -----------------------');

  const dates = ['2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29', '2026-01-30'];
  dates.forEach(date => {
    const soup = byDate[date]?.soup || { portions: 0, dish: '-' };
    const hotMeat = byDate[date]?.hot_meat || { portions: 0, dish: '-' };
    const hotVeg = byDate[date]?.hot_veg || { portions: 0, dish: '-' };

    console.log(
      `${date} | ${soup.portions.toString().padEnd(3)} ${soup.dish.padEnd(20)} | ` +
      `${hotMeat.portions.toString().padEnd(3)} ${hotMeat.dish.padEnd(20)} | ` +
      `${hotVeg.portions.toString().padEnd(3)} ${hotVeg.dish.padEnd(20)}`
    );
  });

  // Check for duplicates
  console.log('\n\nDuplicate check:');
  const groups = {};
  items?.forEach(item => {
    const key = `${item.delivery_date}-${item.meal_type}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  });

  let hasDuplicates = false;
  Object.entries(groups).forEach(([key, items]) => {
    if (items.length > 1) {
      hasDuplicates = true;
      console.log(`  ⚠️  ${key}: ${items.length} duplicates`);
    }
  });

  if (!hasDuplicates) {
    console.log('  ✓ No duplicates found!');
  }
}

verifySnap119();
