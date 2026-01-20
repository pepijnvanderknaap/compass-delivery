-- Create location_settings table to store location-specific configuration
CREATE TABLE IF NOT EXISTS location_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  -- Client Details
  general_phone VARCHAR(50),
  contact_person_name VARCHAR(255),
  contact_person_email VARCHAR(255),
  contact_person_mobile VARCHAR(50),
  billing_contact_name VARCHAR(255),
  billing_contact_email VARCHAR(255),
  billing_contact_phone VARCHAR(50),
  delivery_directions TEXT,

  -- Compass Team
  site_manager_name VARCHAR(255),
  site_manager_email VARCHAR(255),
  site_manager_mobile VARCHAR(50),
  regional_manager_name VARCHAR(255),
  regional_manager_email VARCHAR(255),
  regional_manager_mobile VARCHAR(50),

  -- Dish Settings (portion size overrides)
  soup_portion_size_ml INTEGER, -- Overrides default dish portion size
  salad_bar_portion_size_g INTEGER, -- Overrides default dish portion size

  -- Key Interest Points
  key_interest_points TEXT,

  -- Satisfaction Score (for future review system)
  satisfaction_score DECIMAL(3,1), -- Out of 10, e.g., 8.5

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one settings record per location
  UNIQUE(location_id)
);

-- Create table for additional staff members
CREATE TABLE IF NOT EXISTS location_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  staff_name VARCHAR(255) NOT NULL,
  staff_role VARCHAR(255),
  staff_mobile VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_location_settings_location_id ON location_settings(location_id);
CREATE INDEX IF NOT EXISTS idx_location_staff_location_id ON location_staff(location_id);

-- Create updated_at trigger for location_settings
CREATE OR REPLACE FUNCTION update_location_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_settings_updated_at
  BEFORE UPDATE ON location_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_location_settings_updated_at();

-- Create updated_at trigger for location_staff
CREATE OR REPLACE FUNCTION update_location_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_staff_updated_at
  BEFORE UPDATE ON location_staff
  FOR EACH ROW
  EXECUTE FUNCTION update_location_staff_updated_at();

-- Insert default settings for existing locations
INSERT INTO location_settings (location_id, soup_portion_size_ml, salad_bar_portion_size_g)
SELECT id, 150, 240 FROM locations
ON CONFLICT (location_id) DO NOTHING;
