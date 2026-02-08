import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// POST send an invoice
export async function POST(request: Request) {
  const body = await request.json();
  const { invoiceId } = body;

  if (!invoiceId) {
    return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });

  // Get invoice
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // TODO: Implement email sending logic
  // - Generate PDF
  // - Send email to billing contact
  // - Update invoice status

  // For now, just update the status
  const { data, error } = await supabase
    .from('invoices')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, invoice: data });
}
