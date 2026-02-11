-- Create table for Kitchen Fixed Costs (monthly tracking)
CREATE TABLE IF NOT EXISTS kitchen_fixed_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month_year DATE NOT NULL UNIQUE, -- Format: YYYY-MM-01

  -- Kitchen Lease (calculated from Order Totals COS)
  kitchen_lease_percentage DECIMAL(5, 2) DEFAULT 10.00, -- Default 10%

  -- Delivery Vans (2 vans)
  van_1_lease_monthly DECIMAL(10, 2) DEFAULT 0,
  van_1_fuel_monthly DECIMAL(10, 2) DEFAULT 0,
  van_2_lease_monthly DECIMAL(10, 2) DEFAULT 0,
  van_2_fuel_monthly DECIMAL(10, 2) DEFAULT 0,

  -- Other Fixed Costs
  other_fixed_costs_monthly DECIMAL(10, 2) DEFAULT 0,
  other_fixed_costs_description TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE kitchen_fixed_costs ENABLE ROW LEVEL SECURITY;

-- Admin can read all
CREATE POLICY "Admin can read kitchen_fixed_costs"
  ON kitchen_fixed_costs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admin can insert
CREATE POLICY "Admin can insert kitchen_fixed_costs"
  ON kitchen_fixed_costs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admin can update
CREATE POLICY "Admin can update kitchen_fixed_costs"
  ON kitchen_fixed_costs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create index on month_year for faster lookups
CREATE INDEX IF NOT EXISTS idx_kitchen_fixed_costs_month_year
  ON kitchen_fixed_costs(month_year);
