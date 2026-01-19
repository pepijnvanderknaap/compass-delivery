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

  const { data: order } = await supabase
    .from('orders')
    .select('location_id')
    .eq('id', data.order_id)
    .single();

  if (!order || order.location_id !== profile.location_id) {
    return { error: 'Unauthorized: Order does not belong to your location' };
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

  const { data: order } = await supabase
    .from('orders')
    .select('location_id')
    .eq('id', items[0].order_id)
    .single();

  if (!order || order.location_id !== profile.location_id) {
    return { error: 'Unauthorized: Order does not belong to your location' };
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

  // Verify the order item belongs to the user's location
  const { data: orderItem } = await supabase
    .from('order_items')
    .select('order_id, orders(location_id)')
    .eq('id', data.id)
    .single();

  if (!orderItem || (orderItem.orders as any)?.location_id !== profile.location_id) {
    return { error: 'Unauthorized: Order item does not belong to your location' };
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
