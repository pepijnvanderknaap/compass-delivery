import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  console.log('🔍 Checking for duplicates in database...\n');

  // 1. Check for duplicate location names
  console.log('━━━ LOCATIONS ━━━');
  const { data: locations } = await supabase
    .from('locations')
    .select('name, id');

  if (locations) {
    const nameCount = locations.reduce((acc: Record<string, number>, loc) => {
      acc[loc.name] = (acc[loc.name] || 0) + 1;
      return acc;
    }, {});

    const duplicateLocations = Object.entries(nameCount).filter(([_, count]) => count > 1);
    if (duplicateLocations.length > 0) {
      console.log('❌ Duplicate location names found:');
      duplicateLocations.forEach(([name, count]) => {
        console.log(`   - "${name}" appears ${count} times`);
      });
    } else {
      console.log('✅ No duplicate location names');
    }
  }

  // 2. Check for duplicate dish names
  console.log('\n━━━ DISHES ━━━');
  const { data: dishes } = await supabase
    .from('dishes')
    .select('name, id, is_active');

  if (dishes) {
    const nameCount = dishes.reduce((acc: Record<string, { count: number, active: number, inactive: number }>, dish) => {
      if (!acc[dish.name]) {
        acc[dish.name] = { count: 0, active: 0, inactive: 0 };
      }
      acc[dish.name].count++;
      if (dish.is_active) {
        acc[dish.name].active++;
      } else {
        acc[dish.name].inactive++;
      }
      return acc;
    }, {});

    const duplicateDishes = Object.entries(nameCount).filter(([_, info]) => info.count > 1);
    if (duplicateDishes.length > 0) {
      console.log('❌ Duplicate dish names found:');
      duplicateDishes.forEach(([name, info]) => {
        console.log(`   - "${name}" appears ${info.count} times (${info.active} active, ${info.inactive} inactive)`);
      });
    } else {
      console.log('✅ No duplicate dish names');
    }
  }

  // 3. Check for duplicate user emails
  console.log('\n━━━ USERS ━━━');
  const { data: users } = await supabase
    .from('user_profiles')
    .select('email, id');

  if (users) {
    const emailCount = users.reduce((acc: Record<string, number>, user) => {
      acc[user.email] = (acc[user.email] || 0) + 1;
      return acc;
    }, {});

    const duplicateEmails = Object.entries(emailCount).filter(([_, count]) => count > 1);
    if (duplicateEmails.length > 0) {
      console.log('❌ Duplicate user emails found:');
      duplicateEmails.forEach(([email, count]) => {
        console.log(`   - "${email}" appears ${count} times`);
      });
    } else {
      console.log('✅ No duplicate user emails');
    }
  }

  // 4. Check for duplicate weekly menus (shouldn't happen due to UNIQUE constraint)
  console.log('\n━━━ WEEKLY MENUS ━━━');
  const { data: menus } = await supabase
    .from('weekly_menus')
    .select('week_start_date, id');

  if (menus) {
    const weekCount = menus.reduce((acc: Record<string, number>, menu) => {
      acc[menu.week_start_date] = (acc[menu.week_start_date] || 0) + 1;
      return acc;
    }, {});

    const duplicateWeeks = Object.entries(weekCount).filter(([_, count]) => count > 1);
    if (duplicateWeeks.length > 0) {
      console.log('❌ Duplicate weekly menus found:');
      duplicateWeeks.forEach(([week, count]) => {
        console.log(`   - Week ${week} has ${count} menus`);
      });
    } else {
      console.log('✅ No duplicate weekly menus');
    }
  }

  // 5. Check for duplicate orders (shouldn't happen due to UNIQUE constraint)
  console.log('\n━━━ ORDERS ━━━');
  const { data: orders } = await supabase
    .from('orders')
    .select('location_id, week_start_date, id, locations(name)');

  if (orders) {
    const orderKey = (o: any) => `${o.location_id}|${o.week_start_date}`;
    const orderCount = orders.reduce((acc: Record<string, { count: number, locationName: string }>, order) => {
      const key = orderKey(order);
      if (!acc[key]) {
        acc[key] = { count: 0, locationName: (order as any).locations?.name || 'Unknown' };
      }
      acc[key].count++;
      return acc;
    }, {});

    const duplicateOrders = Object.entries(orderCount).filter(([_, info]) => info.count > 1);
    if (duplicateOrders.length > 0) {
      console.log('❌ Duplicate orders found:');
      duplicateOrders.forEach(([key, info]) => {
        const [_, week] = key.split('|');
        console.log(`   - ${info.locationName} / Week ${week} has ${info.count} orders`);
      });
    } else {
      console.log('✅ No duplicate orders');
    }
  }

  console.log('\n✨ Duplicate check complete!\n');
}

checkDuplicates().catch(console.error);
