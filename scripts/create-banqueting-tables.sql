-- Banqueting Items Catalog
CREATE TABLE IF NOT EXISTS banqueting_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('breakfast', 'coffee_tea_snacks', 'lunch_dinner', 'borrel')),
  price DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL, -- e.g., 'per person', 'per tray', 'per item'
  requires_quote BOOLEAN DEFAULT false,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Banqueting Orders/Quotes
CREATE TABLE IF NOT EXISTS banqueting_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE,
  location_id UUID REFERENCES locations(id),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  delivery_date DATE NOT NULL,
  delivery_time TIME NOT NULL,
  floor_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'confirmed', 'preparing', 'delivered', 'cancelled')),
  po_number TEXT,
  notes TEXT,
  total_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Banqueting Order Items (line items in cart)
CREATE TABLE IF NOT EXISTS banqueting_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES banqueting_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES banqueting_items(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_banqueting_items_category ON banqueting_items(category);
CREATE INDEX IF NOT EXISTS idx_banqueting_items_active ON banqueting_items(is_active);
CREATE INDEX IF NOT EXISTS idx_banqueting_orders_location ON banqueting_orders(location_id);
CREATE INDEX IF NOT EXISTS idx_banqueting_orders_status ON banqueting_orders(status);
CREATE INDEX IF NOT EXISTS idx_banqueting_orders_delivery_date ON banqueting_orders(delivery_date);
