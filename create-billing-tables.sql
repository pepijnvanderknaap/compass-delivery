-- Create location_billing_settings table for pricing and cost configuration
CREATE TABLE IF NOT EXISTS location_billing_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  -- Staff & Overhead Costs
  staff_cost_per_day DECIMAL(10,2) DEFAULT 0.00,
  management_fee_percentage DECIMAL(5,2) DEFAULT 0.00, -- e.g., 15.00 for 15%
  overhead_percentage DECIMAL(5,2) DEFAULT 0.00, -- e.g., 10.00 for 10%

  -- Portion Pricing (per portion in GBP or local currency)
  soup_price_per_portion DECIMAL(10,2) DEFAULT 0.00,
  salad_bar_price_per_portion DECIMAL(10,2) DEFAULT 0.00,
  hot_dish_meat_fish_price_per_portion DECIMAL(10,2) DEFAULT 0.00,
  hot_dish_veg_price_per_portion DECIMAL(10,2) DEFAULT 0.00,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one billing settings record per location
  UNIQUE(location_id)
);

-- Create invoices table for storing generated invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  -- Invoice Details
  invoice_number VARCHAR(50) NOT NULL UNIQUE, -- e.g., "INV-2026-02-ATL-001"
  month VARCHAR(7) NOT NULL, -- e.g., "2026-02" for February 2026

  -- Invoice Data (stored as JSONB for flexibility)
  invoice_data JSONB NOT NULL, -- Contains line items, calculations, etc.

  -- Financial
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- draft, sent, paid, cancelled

  -- PDF Storage
  pdf_url TEXT, -- Path to stored PDF file

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  notes TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_billing_settings_location_id ON location_billing_settings(location_id);
CREATE INDEX IF NOT EXISTS idx_invoices_location_id ON invoices(location_id);
CREATE INDEX IF NOT EXISTS idx_invoices_month ON invoices(month);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- Create updated_at trigger for location_billing_settings
CREATE OR REPLACE FUNCTION update_billing_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_billing_settings_updated_at
  BEFORE UPDATE ON location_billing_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_settings_updated_at();

-- Create updated_at trigger for invoices
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- Insert default billing settings for existing locations (except Symphony)
INSERT INTO location_billing_settings (location_id)
SELECT id FROM locations
WHERE name NOT ILIKE '%symphony%'
ON CONFLICT (location_id) DO NOTHING;
