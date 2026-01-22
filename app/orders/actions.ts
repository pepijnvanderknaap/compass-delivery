'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function createOrderItem(data: {
  order_id: string;
  dish_id: string;
  delivery_date: string;
  portions: number;
}) {
  // First verify the user has permission using the authenticated client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Verify user is a manager for this order's location
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, location_id')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
    return { error: 'Unauthorized: Only managers can create order items' };
  }

  // Admins can create order items for any location, managers only for their own location
  if (profile.role === 'manager') {
    const { data: order } = await supabase
      .from('orders')
      .select('location_id')
      .eq('id', data.order_id)
      .single();

    if (!order || order.location_id !== profile.location_id) {
      return { error: 'Unauthorized: Order does not belong to your location' };
    }
  }

  // Now use service role to bypass RLS for the insert
  // This is safe because we've already verified permissions above
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const { data: orderItem, error } = await serviceClient
    .from('order_items')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating order item:', error);
    return { error: error.message };
  }

  return { data: orderItem };
}

export async function createOrderItemsBatch(items: Array<{
  order_id: string;
  dish_id: string;
  delivery_date: string;
  portions: number;
}>) {
  if (items.length === 0) {
    return { data: [] };
  }

  // First verify the user has permission using the authenticated client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Verify user is a manager/admin for this order's location
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, location_id')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
    return { error: 'Unauthorized: Only managers can create order items' };
  }

  // Admins can create order items for any location, managers only for their own location
  if (profile.role === 'manager') {
    const { data: order } = await supabase
      .from('orders')
      .select('location_id')
      .eq('id', items[0].order_id)
      .single();

    if (!order || order.location_id !== profile.location_id) {
      return { error: 'Unauthorized: Order does not belong to your location' };
    }
  }

  // Now use service role to bypass RLS for the batch insert
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const { data: orderItems, error } = await serviceClient
    .from('order_items')
    .insert(items)
    .select();

  if (error) {
    console.error('Error creating order items:', error);
    return { error: error.message };
  }

  return { data: orderItems };
}

export async function updateOrderItem(data: {
  id: string;
  portions: number;
}) {
  // First verify the user has permission using the authenticated client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Verify user is a manager for this order's location
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, location_id')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
    return { error: 'Unauthorized: Only managers can update order items' };
  }

  // Admins can update order items for any location, managers only for their own location
  if (profile.role === 'manager') {
    const { data: orderItem } = await supabase
      .from('order_items')
      .select('order_id, orders(location_id)')
      .eq('id', data.id)
      .single();

    if (!orderItem || (orderItem.orders as any)?.location_id !== profile.location_id) {
      return { error: 'Unauthorized: Order item does not belong to your location' };
    }
  }

  // Now use service role to bypass RLS for the update
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const { data: updatedItem, error } = await serviceClient
    .from('order_items')
    .update({ portions: data.portions })
    .eq('id', data.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating order item:', error);
    return { error: error.message };
  }

  return { data: updatedItem };
}

export async function ensureFourWeeksAhead(locationId: string, weekDates: string[]) {
  try {
    // First verify the user has permission using the authenticated client
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is a manager/admin for this location
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, location_id')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
      return { success: false, error: 'Unauthorized: Only managers can create orders' };
    }

    // Admins can create orders for any location, managers only for their own location
    if (profile.role === 'manager' && profile.location_id !== locationId) {
      return { success: false, error: 'Unauthorized: Cannot create orders for other locations' };
    }

    // Check which weeks exist
    const { data: existingOrders, error: fetchError } = await supabase
      .from('orders')
      .select('week_start_date')
      .eq('location_id', locationId);

    if (fetchError) {
      console.error('[Server Action] Error fetching existing orders:', fetchError);
      return { success: false, error: `Failed to check existing orders: ${fetchError.message}` };
    }

    const existingWeekStarts = new Set(
      (existingOrders || []).map(o => o.week_start_date)
    );

    console.log(`[Server Action] Location ${locationId}: Found ${existingWeekStarts.size} existing weeks`);

    // Create missing weeks from client-provided dates
    const weeksToCreate = [];
    for (const weekDate of weekDates) {
      if (!existingWeekStarts.has(weekDate)) {
        weeksToCreate.push({
          location_id: locationId,
          week_start_date: weekDate
        });
      }
    }

    // Insert missing weeks using service role (bypasses RLS)
    // This is safe because we've already verified permissions above
    if (weeksToCreate.length > 0) {
      console.log(`[Server Action] Creating ${weeksToCreate.length} missing weeks for location ${locationId}:`, weeksToCreate);

      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      const { error: insertError, data: insertedData } = await serviceClient
        .from('orders')
        .insert(weeksToCreate)
        .select();

      if (insertError) {
        console.error('[Server Action] Error creating missing weeks:', insertError);
        return { success: false, error: `Failed to create weeks: ${insertError.message}` };
      }

      console.log(`[Server Action] Successfully created ${insertedData?.length || 0} weeks`);

      // Now populate newly created weeks with default template values
      // IMPORTANT: Only populate defaults for brand new empty weeks (no existing order_items)
      // Fetch default template for this location
      const { data: defaultTemplates } = await serviceClient
        .from('default_week_templates')
        .select('*')
        .eq('location_id', locationId);

      if (defaultTemplates && defaultTemplates.length > 0) {
        console.log(`[Server Action] Found ${defaultTemplates.length} default templates, populating new weeks...`);

        // Get active dishes by category
        const { data: dishes } = await serviceClient
          .from('dishes')
          .select('id, category')
          .eq('is_active', true);

        const dishByCategory: Record<string, string> = {};
        dishes?.forEach(dish => {
          if (!dishByCategory[dish.category]) {
            dishByCategory[dish.category] = dish.id;
          }
        });

        // Create order_items for each newly created week (these are guaranteed to be empty)
        const orderItemsToCreate = [];

        for (const order of insertedData || []) {
          // Double-check this order has no existing items (safety check)
          const { data: existingItems } = await serviceClient
            .from('order_items')
            .select('id')
            .eq('order_id', order.id)
            .limit(1);

          if (existingItems && existingItems.length > 0) {
            console.log(`[Server Action] Skipping order ${order.id} - already has items`);
            continue;
          }
          const weekStartDate = new Date(order.week_start_date);

          // For each day of the week (Monday-Friday)
          for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
            const template = defaultTemplates.find(t => t.day_of_week === dayOfWeek);
            if (!template) continue;

            // Calculate delivery date
            const deliveryDate = new Date(weekStartDate);
            deliveryDate.setDate(weekStartDate.getDate() + (dayOfWeek - 1));
            const deliveryDateStr = deliveryDate.toISOString().split('T')[0];

            // Create order items for each category with default values
            // Note: hot_dish_meat_fish creates MEAT by default (manager can change to fish if needed)
            if (template.soup > 0 && dishByCategory['soup']) {
              orderItemsToCreate.push({
                order_id: order.id,
                dish_id: dishByCategory['soup'],
                delivery_date: deliveryDateStr,
                portions: template.soup
              });
            }

            if (template.hot_dish_meat_fish > 0 && dishByCategory['hot_dish_meat']) {
              orderItemsToCreate.push({
                order_id: order.id,
                dish_id: dishByCategory['hot_dish_meat'],
                delivery_date: deliveryDateStr,
                portions: template.hot_dish_meat_fish
              });
            }

            if (template.hot_dish_veg > 0 && dishByCategory['hot_dish_veg']) {
              orderItemsToCreate.push({
                order_id: order.id,
                dish_id: dishByCategory['hot_dish_veg'],
                delivery_date: deliveryDateStr,
                portions: template.hot_dish_veg
              });
            }
          }
        }

        // Insert all order items at once
        if (orderItemsToCreate.length > 0) {
          const { error: itemsError } = await serviceClient
            .from('order_items')
            .insert(orderItemsToCreate);

          if (itemsError) {
            console.error('[Server Action] Error creating default order items:', itemsError);
            // Don't fail the entire operation, just log the error
          } else {
            console.log(`[Server Action] Created ${orderItemsToCreate.length} default order items`);
          }
        }
      }

      return { success: true, created: insertedData?.length || 0 };
    } else {
      console.log('[Server Action] All 4 weeks already exist, no creation needed');
      return { success: true, created: 0 };
    }
  } catch (error) {
    console.error('[Server Action] Unexpected error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function saveDefaultWeekTemplate(
  locationId: string,
  templates: Array<{
    day_of_week: number;
    soup: number;
    hot_dish_meat_fish: number;
    hot_dish_veg: number;
  }>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Verify user is a manager/admin for this location
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, location_id')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
    return { error: 'Unauthorized: Only managers can set default templates' };
  }

  // Admins can set defaults for any location, managers only for their own
  if (profile.role === 'manager' && profile.location_id !== locationId) {
    return { error: 'Unauthorized: Cannot set defaults for other locations' };
  }

  // Use service role to save templates
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Delete existing templates for this location
  await serviceClient
    .from('default_week_templates')
    .delete()
    .eq('location_id', locationId);

  // Insert new templates
  const templatesWithLocation = templates.map(t => ({
    ...t,
    location_id: locationId
  }));

  const { error } = await serviceClient
    .from('default_week_templates')
    .insert(templatesWithLocation);

  if (error) {
    console.error('Error saving default templates:', error);
    return { error: error.message };
  }

  return { success: true };
}

export async function getDefaultWeekTemplate(locationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('default_week_templates')
    .select('*')
    .eq('location_id', locationId)
    .order('day_of_week');

  if (error) {
    console.error('Error fetching default templates:', error);
    return { error: error.message };
  }

  return { data };
}

export async function clearWeekOrders(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Verify user is a manager/admin for this order's location
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, location_id')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
    return { error: 'Unauthorized: Only managers can clear orders' };
  }

  // Verify the order belongs to the user's location (or user is admin)
  if (profile.role === 'manager') {
    const { data: order } = await supabase
      .from('orders')
      .select('location_id')
      .eq('id', orderId)
      .single();

    if (!order || order.location_id !== profile.location_id) {
      return { error: 'Unauthorized: Order does not belong to your location' };
    }
  }

  // Delete all order_items for this order using service role
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const { error } = await serviceClient
    .from('order_items')
    .delete()
    .eq('order_id', orderId);

  if (error) {
    console.error('Error clearing week orders:', error);
    return { error: error.message };
  }

  return { success: true };
}
