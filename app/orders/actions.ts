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

  if (!profile || profile.role !== 'manager') {
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
