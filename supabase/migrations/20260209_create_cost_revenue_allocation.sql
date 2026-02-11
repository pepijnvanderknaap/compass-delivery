-- Create table for Cost & Revenue Allocation (monthly tracking per location)
CREATE TABLE IF NOT EXISTS cost_revenue_allocation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month_year DATE NOT NULL, -- Format: YYYY-MM-01
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  -- Allocation percentages (must sum to 100% across all locations for the same month)
  kitchen_staff_allocation_percentage DECIMAL(5, 2) DEFAULT 0, -- e.g., 20.00 for 20%
  fixed_cost_allocation_percentage DECIMAL(5, 2) DEFAULT 0, -- e.g., 15.00 for 15%

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one record per location per month
  UNIQUE(month_year, location_id)
);

-- Add RLS policies
ALTER TABLE cost_revenue_allocation ENABLE ROW LEVEL SECURITY;

-- Admin can read all
CREATE POLICY "Admin can read cost_revenue_allocation"
  ON cost_revenue_allocation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admin can insert
CREATE POLICY "Admin can insert cost_revenue_allocation"
  ON cost_revenue_allocation FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admin can update
CREATE POLICY "Admin can update cost_revenue_allocation"
  ON cost_revenue_allocation FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_cost_revenue_allocation_month_year
  ON cost_revenue_allocation(month_year);

CREATE INDEX IF NOT EXISTS idx_cost_revenue_allocation_location
  ON cost_revenue_allocation(location_id);

CREATE INDEX IF NOT EXISTS idx_cost_revenue_allocation_month_location
  ON cost_revenue_allocation(month_year, location_id);
