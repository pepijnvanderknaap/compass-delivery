'use server';

import { createClient } from '@/lib/supabase/server';

export async function createOrderItem(data: {
  order_id: string;
  dish_id: string;
  delivery_date: string;
  portions: number;
}) {
  const supabase = await createClient();

  const { data: orderItem, error } = await supabase
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
