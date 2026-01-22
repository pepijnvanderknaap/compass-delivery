-- Create warm_veggie_components table for main dishes with percentage-based warm veggie components
-- Each main dish can have its own unique warm veggie composition
CREATE TABLE warm_veggie_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  main_dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  component_dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  percentage DECIMAL(5, 2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX idx_warm_veggie_components_main_dish ON warm_veggie_components(main_dish_id);
CREATE INDEX idx_warm_veggie_components_component ON warm_veggie_components(component_dish_id);

-- Add updated_at trigger
CREATE TRIGGER update_warm_veggie_components_updated_at BEFORE UPDATE ON warm_veggie_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE warm_veggie_components ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same as dishes - all authenticated users can view, admins can manage)
CREATE POLICY "All authenticated users can view warm veggie components" ON warm_veggie_components
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage warm veggie components" ON warm_veggie_components
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
