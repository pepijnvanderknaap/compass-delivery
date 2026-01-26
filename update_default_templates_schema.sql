-- Update default_week_templates to combine meat and fish into one column
-- First, drop the existing table
DROP TABLE IF EXISTS default_week_templates CASCADE;

-- Recreate with correct structure
CREATE TABLE default_week_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 5), -- 1=Monday, 5=Friday
  soup INTEGER NOT NULL DEFAULT 0,
  hot_dish_meat_fish INTEGER NOT NULL DEFAULT 0,  -- Combined: either meat or fish
  hot_dish_veg INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, day_of_week)
);

-- Enable RLS
ALTER TABLE default_week_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Managers can view/edit their location's template, admins can view/edit all
CREATE POLICY "Users can view default templates for their location"
  ON default_week_templates FOR SELECT
  USING (
    location_id IN (
      SELECT location_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Managers can update their location's default template"
  ON default_week_templates FOR ALL
  USING (
    location_id IN (
      SELECT location_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_default_week_templates_location ON default_week_templates(location_id);
