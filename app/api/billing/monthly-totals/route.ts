import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET monthly totals for a location
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId');
  const month = searchParams.get('month'); // Format: YYYY-MM

  if (!locationId) {
    return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });

  // Get billing settings to calculate revenue
  const { data: settings } = await supabase
    .from('location_billing_settings')
    .select('*')
    .eq('location_id', locationId)
    .single();

  if (!settings) {
    return NextResponse.json({ error: 'Billing settings not found' }, { status: 404 });
  }

  // Determine date range
  let startDate, endDate;
  if (month) {
    // Specific month
    const [year, monthNum] = month.split('-');
    startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1).toISOString();
    endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString();
  } else {
    // Current month
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  }

  // Fetch orders for the date range
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      dishes:dish_id (
        name,
        main_category,
        is_vegetarian
      )
    `)
    .eq('location_id', locationId)
    .gte('delivery_date', startDate)
    .lte('delivery_date', endDate);

  if (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate totals by category
  const totals = {
    soup: { portions: 0, revenue: 0 },
    salad_bar: { portions: 0, revenue: 0 },
    hot_dish_meat: { portions: 0, revenue: 0 },
    hot_dish_veg: { portions: 0, revenue: 0 },
    total_revenue: 0,
    total_costs: 0,
  };

  orders?.forEach((order: any) => {
    const dish = order.dishes;
    const portions = order.quantity || 0;

    if (!dish) return;

    if (dish.main_category === 'Soup') {
      totals.soup.portions += portions;
      totals.soup.revenue += portions * settings.soup_price_per_portion;
    } else if (dish.main_category === 'Salad Bar') {
      totals.salad_bar.portions += portions;
      totals.salad_bar.revenue += portions * settings.salad_bar_price_per_portion;
    } else if (dish.main_category === 'Hot Dish') {
      if (dish.is_vegetarian) {
        totals.hot_dish_veg.portions += portions;
        totals.hot_dish_veg.revenue += portions * settings.hot_dish_veg_price_per_portion;
      } else {
        totals.hot_dish_meat.portions += portions;
        totals.hot_dish_meat.revenue += portions * settings.hot_dish_meat_fish_price_per_portion;
      }
    }
  });

  totals.total_revenue =
    totals.soup.revenue +
    totals.salad_bar.revenue +
    totals.hot_dish_meat.revenue +
    totals.hot_dish_veg.revenue;

  // Calculate costs (simplified - would need actual business days calculation)
  const daysInMonth = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  const businessDays = Math.floor(daysInMonth * (5/7)); // Rough estimate

  totals.total_costs =
    (settings.staff_cost_per_day * businessDays) +
    (totals.total_revenue * (settings.management_fee_percentage / 100)) +
    (totals.total_revenue * (settings.overhead_percentage / 100));

  return NextResponse.json(totals);
}
