-- Create banqueting orders system with multi-timeslot support

-- Main orders table
CREATE TABLE IF NOT EXISTS symphony_banqueting_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES symphony_companies(id) ON DELETE CASCADE,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  order_date DATE NOT NULL,
  po_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  total_amount DECIMAL(10,2) DEFAULT 0,
  order_type VARCHAR(20) DEFAULT 'order', -- 'order' or 'quote'
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Time slots within an order
CREATE TABLE IF NOT EXISTS symphony_banqueting_timeslots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES symphony_banqueting_orders(id) ON DELETE CASCADE,
  delivery_time TIME NOT NULL,
  floor_number VARCHAR(10),
  guest_count INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Items within each timeslot
CREATE TABLE IF NOT EXISTS symphony_banqueting_timeslot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeslot_id UUID NOT NULL REFERENCES symphony_banqueting_timeslots(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES banqueting_items(id),
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_banqueting_orders_company ON symphony_banqueting_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_banqueting_orders_date ON symphony_banqueting_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_banqueting_orders_status ON symphony_banqueting_orders(status);
CREATE INDEX IF NOT EXISTS idx_banqueting_timeslots_order ON symphony_banqueting_timeslots(order_id);
CREATE INDEX IF NOT EXISTS idx_banqueting_timeslot_items_timeslot ON symphony_banqueting_timeslot_items(timeslot_id);

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_banqueting_order_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  order_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM symphony_banqueting_orders
  WHERE order_number LIKE 'SYM%';

  order_num := 'SYM' || LPAD(next_number::TEXT, 5, '0');
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE symphony_banqueting_orders IS 'Main orders for Symphony banqueting with multi-timeslot support';
COMMENT ON TABLE symphony_banqueting_timeslots IS 'Multiple delivery times within a single order';
COMMENT ON TABLE symphony_banqueting_timeslot_items IS 'Products for each timeslot';
