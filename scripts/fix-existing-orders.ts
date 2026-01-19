import { createClient } from '@supabase/supabase-js';
import { format, addDays } from 'date-fns';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixExistingOrders() {
  console.log('Starting to fix existing orders...');

  // Get all orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, week_start_date, location_id, locations(name)');

  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
    console.error('Error details:', JSON.stringify(ordersError, null, 2));
    return;
  }

  console.log(`Found ${orders?.length || 0} orders to fix`);

  if (orders && orders.length > 0) {
    console.log('Order details:', JSON.stringify(orders, null, 2));
  }

  // Get dishes for each category
  const { data: dishes, error: dishesError } = await supabase
    .from('dishes')
    .select('id, category')
    .eq('is_active', true);

  if (dishesError) {
    console.error('Error fetching dishes:', dishesError);
    return;
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
      } else {
        console.log(`  ✓ Successfully created order items`);
      }
    } else {
      console.log(`  ✓ All order items already exist`);
    }
  }

  console.log('\n✅ Finished fixing all orders!');
}

fixExistingOrders().catch(console.error);
