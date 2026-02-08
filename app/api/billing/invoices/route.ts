import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET invoices for a location
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId');
  const status = searchParams.get('status'); // Optional filter by status

  if (!locationId) {
    return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
  }

  const supabase = await createClient();

  let query = supabase
    .from('invoices')
    .select('*')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST create a new invoice
export async function POST(request: Request) {
  const body = await request.json();
  const { locationId, month } = body;

  if (!locationId || !month) {
    return NextResponse.json({ error: 'Location ID and month are required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Get location details
  const { data: location } = await supabase
    .from('locations')
    .select('*, location_settings(*)')
    .eq('id', locationId)
    .single();

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  // Get billing settings
  const { data: billingSettings } = await supabase
    .from('location_billing_settings')
    .select('*')
    .eq('location_id', locationId)
    .single();

  if (!billingSettings) {
    return NextResponse.json({ error: 'Billing settings not found' }, { status: 404 });
  }

  // Calculate date range for the month
  const [year, monthNum] = month.split('-');
  const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1).toISOString();
  const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString();

  // Fetch orders for the month
  const { data: orders } = await supabase
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
    .lte('delivery_date', endDate)
    .order('delivery_date', { ascending: true });

  // Build line items
  const lineItems: any[] = [];
  let subtotal = 0;

  orders?.forEach((order: any) => {
    const dish = order.dishes;
    if (!dish) return;

    const portions = order.quantity || 0;
    let unitPrice = 0;
    let category = '';

    if (dish.main_category === 'Soup') {
      unitPrice = billingSettings.soup_price_per_portion;
      category = 'Soup';
    } else if (dish.main_category === 'Salad Bar') {
      unitPrice = billingSettings.salad_bar_price_per_portion;
      category = 'Salad Bar';
    } else if (dish.main_category === 'Hot Dish') {
      if (dish.is_vegetarian) {
        unitPrice = billingSettings.hot_dish_veg_price_per_portion;
        category = 'Hot Dish (Veg)';
      } else {
        unitPrice = billingSettings.hot_dish_meat_fish_price_per_portion;
        category = 'Hot Dish (Meat/Fish)';
      }
    }

    const total = portions * unitPrice;
    subtotal += total;

    lineItems.push({
      date: order.delivery_date,
      description: dish.name,
      category,
      quantity: portions,
      unit_price: unitPrice,
      total,
    });
  });

  // Calculate costs
  const daysInMonth = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  const businessDays = Math.floor(daysInMonth * (5/7));

  const staffCost = billingSettings.staff_cost_per_day * businessDays;
  const managementFee = subtotal * (billingSettings.management_fee_percentage / 100);
  const overhead = subtotal * (billingSettings.overhead_percentage / 100);

  // Generate invoice number
  const invoiceNumber = `INV-${year}-${monthNum}-${location.slug.toUpperCase().substring(0, 3)}-${Date.now().toString().slice(-4)}`;

  // Build invoice data
  const invoiceData = {
    location_name: location.name,
    billing_contact: {
      name: location.location_settings?.[0]?.billing_contact_name || '',
      email: location.location_settings?.[0]?.billing_contact_email || '',
      phone: location.location_settings?.[0]?.billing_contact_phone || '',
    },
    period: {
      start: startDate,
      end: endDate,
    },
    line_items: lineItems,
    costs: {
      staff_cost: staffCost,
      management_fee: managementFee,
      overhead: overhead,
    },
  };

  const totalAmount = subtotal + staffCost + managementFee + overhead;

  // Create invoice
  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      location_id: locationId,
      invoice_number: invoiceNumber,
      month,
      invoice_data: invoiceData,
      subtotal,
      tax_amount: 0, // TODO: Add tax calculation if needed
      total_amount: totalAmount,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(invoice);
}
