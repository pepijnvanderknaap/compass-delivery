-- Create invoices table for storing monthly invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  invoice_month INTEGER NOT NULL, -- Month number (1-12)
  invoice_year INTEGER NOT NULL, -- Year (e.g., 2026)
  invoice_number VARCHAR(50), -- Generated invoice number (e.g., "INV-2026-02-SNOWFLAKE")

  -- Manual editable fields
  breakfast_count INTEGER DEFAULT 0,
  breakfast_price DECIMAL(10,2) DEFAULT 4.93,
  sandwich_count INTEGER DEFAULT 0,
  sandwich_price DECIMAL(10,2) DEFAULT 3.10,
  pantry_cost DECIMAL(10,2) DEFAULT 0.00,

  -- Auto-populated from orders (cached for history)
  soup_portions INTEGER DEFAULT 0,
  soup_price DECIMAL(10,2) DEFAULT 0.00,
  salad_bar_portions INTEGER DEFAULT 0,
  salad_bar_price DECIMAL(10,2) DEFAULT 0.00,
  hot_dish_meat_portions INTEGER DEFAULT 0,
  hot_dish_meat_price DECIMAL(10,2) DEFAULT 0.00,
  hot_dish_veg_portions INTEGER DEFAULT 0,
  hot_dish_veg_price DECIMAL(10,2) DEFAULT 0.00,

  -- Calculated totals (cached)
  food_subtotal DECIMAL(10,2) DEFAULT 0.00,
  management_fee DECIMAL(10,2) DEFAULT 0.00, -- 10% of food_subtotal
  staff_subtotal DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) DEFAULT 0.00,

  -- Status and metadata
  status VARCHAR(20) DEFAULT 'draft', -- draft, finalized, sent, paid
  finalized_at TIMESTAMP,
  sent_at TIMESTAMP,
  paid_at TIMESTAMP,
  pdf_url TEXT,
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),

  -- Ensure one invoice per location per month
  UNIQUE(location_id, invoice_month, invoice_year)
);

-- Create invoice_staff_items table for storing staff days worked
CREATE TABLE IF NOT EXISTS invoice_staff_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  staff_member_id UUID, -- NULL if site manager
  staff_name VARCHAR(255) NOT NULL,
  is_site_manager BOOLEAN DEFAULT FALSE,
  days_worked INTEGER DEFAULT 0,
  daily_rate DECIMAL(10,2) DEFAULT 0.00,
  total_cost DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_location_date ON invoices(location_id, invoice_year, invoice_month);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_staff_items_invoice ON invoice_staff_items(invoice_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoice_staff_items_updated_at ON invoice_staff_items;
CREATE TRIGGER update_invoice_staff_items_updated_at
  BEFORE UPDATE ON invoice_staff_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
