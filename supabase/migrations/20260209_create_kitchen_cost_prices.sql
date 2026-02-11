-- Create table for monthly kitchen cost prices
CREATE TABLE IF NOT EXISTS kitchen_cost_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year DATE NOT NULL, -- First day of the month (e.g., '2026-02-01')
  soup_cost_price DECIMAL(10, 2),
  salad_bar_cost_price DECIMAL(10, 2),
  hot_dish_meat_cost_price DECIMAL(10, 2),
  hot_dish_veg_cost_price DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month_year) -- Only one record per month
);

-- Create index for faster lookups by month
CREATE INDEX IF NOT EXISTS idx_kitchen_cost_prices_month_year ON kitchen_cost_prices(month_year);

-- Enable RLS
ALTER TABLE kitchen_cost_prices ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read
CREATE POLICY "Allow authenticated users to read kitchen cost prices"
  ON kitchen_cost_prices
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert/update
CREATE POLICY "Allow authenticated users to insert/update kitchen cost prices"
  ON kitchen_cost_prices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
