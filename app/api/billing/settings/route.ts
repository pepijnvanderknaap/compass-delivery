import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET billing settings for a location
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId');

  if (!locationId) {
    return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });

  const { data, error } = await supabase
    .from('location_billing_settings')
    .select('*')
    .eq('location_id', locationId)
    .single();

  if (error) {
    console.error('Error fetching billing settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PUT billing settings for a location
export async function PUT(request: Request) {
  const body = await request.json();
  const { locationId, ...settings } = body;

  if (!locationId) {
    return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });

  const { data, error } = await supabase
    .from('location_billing_settings')
    .upsert({
      location_id: locationId,
      ...settings,
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating billing settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
