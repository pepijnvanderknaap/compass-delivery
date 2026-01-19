import { createClient } from '@/lib/supabase/server';
import { format, addDays } from 'date-fns';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();

  console.log('Starting to fix existing orders...');

  // Get all orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, week_start_date, location_id, locations(name)');

  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
    return NextResponse.json({ error: ordersError.message }, { status: 500 });
  }

  console.log(`Found ${orders?.length || 0} orders to fix`);

  // Get dishes for each category
  const { data: dishes, error: dishesError } = await supabase
    .from('dishes')
    .select('id, category')
    .eq('is_active', true);

  if (dishesError) {
    console.error('Error fetching dishes:', dishesError);
    return NextResponse.json({ error: dishesError.message }, { status: 500 });
  }

  const dishByCategory: Record<string, string> = {};
  dishes?.forEach(dish => {
    if (!dishByCategory[dish.category]) {
      dishByCategory[dish.category] = dish.id;
    }
  });

  // Location-based presets (default to 75 for Snapchat 119)
  const locationPresets: Record<string, number> = {
    'Snapchat 119': 75,
    'Snapchat 165': 25,
    'Symphony': 80,
    'Atlassian': 100,
    'Snowflake': 55,
    'JAA Training': 30
  };

  const categories = ['soup', 'salad_bar', 'hot_dish_meat', 'hot_dish_vegetarian'];
  const results = [];

  for (const order of orders || []) {
    console.log(`\nProcessing order ${order.id} for week ${order.week_start_date}`);

    const locationName = (order.locations as any)?.name || '';
    const defaultPortions = locationPresets[locationName] || 75;

    console.log(`  Location: ${locationName}, Default portions: ${defaultPortions}`);

    // Check existing order items
    const { data: existingItems } = await supabase
      .from('order_items')
      .select('id, delivery_date, dishes(category)')
      .eq('order_id', order.id);

    console.log(`  Found ${existingItems?.length || 0} existing order items`);

    // Create order items for all 5 days and 4 categories
    const orderItems = [];
    for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
      const deliveryDate = format(addDays(new Date(order.week_start_date), dayIndex), 'yyyy-MM-dd');

      for (const category of categories) {
        // Check if order item already exists
        const exists = existingItems?.some(
          item => item.delivery_date === deliveryDate && (item.dishes as any)?.category === category
        );

        if (!exists && dishByCategory[category]) {
          orderItems.push({
            order_id: order.id,
            dish_id: dishByCategory[category],
            delivery_date: deliveryDate,
            portions: defaultPortions,
          });
        }
      }
    }

    if (orderItems.length > 0) {
      console.log(`  Creating ${orderItems.length} missing order items with ${defaultPortions} portions each`);
      const { error: insertError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (insertError) {
        console.error(`  Error creating order items for order ${order.id}:`, insertError);
        results.push({ orderId: order.id, status: 'error', error: insertError.message });
      } else {
        console.log(`  ✓ Successfully created order items`);
        results.push({ orderId: order.id, status: 'success', itemsCreated: orderItems.length });
      }
    } else {
      console.log(`  ✓ All order items already exist`);
      results.push({ orderId: order.id, status: 'skipped', reason: 'all items exist' });
    }
  }

  console.log('\n✅ Finished fixing all orders!');

  return NextResponse.json({
    success: true,
    totalOrders: orders?.length || 0,
    results
  });
}
