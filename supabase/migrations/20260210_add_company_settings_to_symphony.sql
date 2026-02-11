-- Add company settings to symphony_companies table
ALTER TABLE symphony_companies
ADD COLUMN IF NOT EXISTS po_workflow VARCHAR(50) DEFAULT 'provide_with_order',
ADD COLUMN IF NOT EXISTS requires_invoice_export BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invoice_export_format VARCHAR(50),
ADD COLUMN IF NOT EXISTS accounting_software VARCHAR(100),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing TCS account with sample settings
UPDATE symphony_companies
SET
  po_workflow = 'quote_then_po',
  requires_invoice_export = true,
  accounting_software = 'QuickBooks'
WHERE company_name = 'TCS';

COMMENT ON COLUMN symphony_companies.po_workflow IS 'PO number workflow: provide_with_order, quote_then_po, or no_po_required';
COMMENT ON COLUMN symphony_companies.requires_invoice_export IS 'Whether company needs invoice files for import';
COMMENT ON COLUMN symphony_companies.invoice_export_format IS 'Preferred invoice format (PDF, CSV, XML, etc.)';
COMMENT ON COLUMN symphony_companies.accounting_software IS 'Accounting software used (for invoice compatibility)';
