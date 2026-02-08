-- Create catering_orders table for off-menu special orders
CREATE TABLE IF NOT EXISTS catering_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  description TEXT NOT NULL, -- e.g., "200 canapés for drinks party"
  estimated_portions INTEGER DEFAULT 0,
  
  -- Costs (calculated by Kitchen)
  food_cost DECIMAL(10,2) DEFAULT 0.00,
  labor_cost DECIMAL(10,2) DEFAULT 0.00,
  total_cost DECIMAL(10,2) DEFAULT 0.00, -- food_cost + labor_cost
  
  -- Status workflow
  status VARCHAR(20) DEFAULT 'draft', -- draft, ready_for_production, delivered
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  built_by UUID REFERENCES user_profiles(id), -- Kitchen staff who built the order
  
  -- Constraints
  CHECK (delivery_date >= CURRENT_DATE + INTERVAL '4 days') -- Minimum 4 days lead time
);

-- Create catering_order_items table for components in each order
CREATE TABLE IF NOT EXISTS catering_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catering_order_id UUID NOT NULL REFERENCES catering_orders(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id),
  quantity_g INTEGER NOT NULL, -- Quantity in grams
  cost_per_kg DECIMAL(10,2) DEFAULT 0.00, -- Snapshot of component cost at time of order
  total_cost DECIMAL(10,2) DEFAULT 0.00, -- (quantity_g / 1000) * cost_per_kg
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_catering_orders_location_date ON catering_orders(location_id, delivery_date);
CREATE INDEX IF NOT EXISTS idx_catering_orders_delivery_date ON catering_orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_catering_orders_status ON catering_orders(status);
CREATE INDEX IF NOT EXISTS idx_catering_order_items_order ON catering_order_items(catering_order_id);

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_catering_orders_updated_at ON catering_orders;
CREATE TRIGGER update_catering_orders_updated_at
  BEFORE UPDATE ON catering_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_catering_order_items_updated_at ON catering_order_items;
CREATE TRIGGER update_catering_order_items_updated_at
  BEFORE UPDATE ON catering_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
