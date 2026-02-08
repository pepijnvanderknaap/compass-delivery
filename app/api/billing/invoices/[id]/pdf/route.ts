import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET download invoice PDF
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const invoiceId = params.id;

  const supabase = await createClient();

  // Get invoice
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // TODO: Implement PDF generation
  // - Use a library like jsPDF or puppeteer
  // - Generate PDF from invoice data
  // - Store in storage (Supabase Storage or S3)
  // - Return PDF file

  // For now, return invoice data as JSON
  return NextResponse.json({
    message: 'PDF generation not yet implemented',
    invoice_data: invoice.invoice_data,
  });
}
