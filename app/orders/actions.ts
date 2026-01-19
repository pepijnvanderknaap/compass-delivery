'use server';

import { createClient } from '@/lib/supabase/server';

export async function createOrderItem(data: {
  order_id: string;
  dish_id: string;
  delivery_date: string;
  portions: number;
}) {
  const supabase = await createClient();

  // Get current user for debugging
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Server action - Current user:', user?.id);
  console.log('Server action - Inserting order item:', data);

  // Check if the RLS policy conditions are met
  const { data: profileCheck } = await supabase
    .from('user_profiles')
    .select('id, role, location_id')
    .eq('id', user?.id)
    .single();
  console.log('User profile:', profileCheck);

  const { data: orderCheck } = await supabase
    .from('orders')
    .select('id, location_id')
    .eq('id', data.order_id)
    .single();
  console.log('Order location:', orderCheck);

  const { data: orderItem, error } = await supabase
    .from('order_items')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating order item:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return { error: error.message, details: error };
  }

  console.log('Successfully created order item:', orderItem);
  return { data: orderItem };
}
