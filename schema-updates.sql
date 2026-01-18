-- Schema updates for location settings and production features

-- 1. Add portion size settings to locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS soup_portion_ml INTEGER DEFAULT 250;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS salad_bar_portion_grams INTEGER DEFAULT 150;

-- 2. Add photo and allergen support to dishes
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Create allergens table
CREATE TABLE IF NOT EXISTS allergens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT, -- emoji or icon identifier
  color TEXT DEFAULT '#FFA500', -- hex color for badge
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create dish-allergen junction table
CREATE TABLE IF NOT EXISTS dish_allergens (
  dish_id UUID REFERENCES dishes(id) ON DELETE CASCADE,
  allergen_id UUID REFERENCES allergens(id) ON DELETE CASCADE,
  PRIMARY KEY (dish_id, allergen_id)
);

-- 5. Create weekly menus table
CREATE TABLE IF NOT EXISTS weekly_menus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start_date DATE NOT NULL UNIQUE,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create menu-dish assignments (which dish on which day)
CREATE TABLE IF NOT EXISTS menu_dishes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID REFERENCES weekly_menus(id) ON DELETE CASCADE,
  dish_id UUID REFERENCES dishes(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 4), -- 0=Monday, 4=Friday
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(menu_id, dish_id, day_of_week)
);

-- 7. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  dish_id UUID REFERENCES dishes(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Insert common allergens
INSERT INTO allergens (name, icon, color) VALUES
  ('Gluten', '🌾', '#D4A574'),
  ('Dairy', '🥛', '#FFFFFF'),
  ('Eggs', '🥚', '#FFF8DC'),
  ('Fish', '🐟', '#4682B4'),
  ('Shellfish', '🦐', '#FF6347'),
  ('Tree Nuts', '🌰', '#8B4513'),
  ('Peanuts', '🥜', '#DEB887'),
  ('Soy', '🫘', '#8FBC8F'),
  ('Sesame', '🫘', '#F5DEB3'),
  ('Celery', '🥬', '#90EE90'),
  ('Mustard', '🟡', '#FFDB58'),
  ('Lupin', '🌺', '#DDA0DD'),
  ('Molluscs', '🐚', '#B0C4DE'),
  ('Sulphites', '⚗️', '#E0E0E0')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS policies
ALTER TABLE allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for allergens (read-only for all authenticated users)
CREATE POLICY "Anyone can view allergens"
  ON allergens FOR SELECT
  TO authenticated
  USING (true);

-- Admin/kitchen can manage allergens
CREATE POLICY "Admin and kitchen can insert allergens"
  ON allergens FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'kitchen')
    )
  );

-- RLS Policies for dish_allergens
CREATE POLICY "Anyone can view dish allergens"
  ON dish_allergens FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and kitchen can manage dish allergens"
  ON dish_allergens FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'kitchen')
    )
  );

-- RLS Policies for weekly_menus
CREATE POLICY "Anyone can view weekly menus"
  ON weekly_menus FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and kitchen can manage weekly menus"
  ON weekly_menus FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'kitchen')
    )
  );

-- RLS Policies for menu_dishes
CREATE POLICY "Anyone can view menu dishes"
  ON menu_dishes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and kitchen can manage menu dishes"
  ON menu_dishes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'kitchen')
    )
  );

-- RLS Policies for reviews
CREATE POLICY "Users can view reviews for their location"
  ON reviews FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'kitchen')
    )
  );

CREATE POLICY "Managers can create reviews for their location"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    location_id IN (
      SELECT location_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dish_allergens_dish ON dish_allergens(dish_id);
CREATE INDEX IF NOT EXISTS idx_dish_allergens_allergen ON dish_allergens(allergen_id);
CREATE INDEX IF NOT EXISTS idx_menu_dishes_menu ON menu_dishes(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_dishes_dish ON menu_dishes(dish_id);
CREATE INDEX IF NOT EXISTS idx_reviews_location ON reviews(location_id);
CREATE INDEX IF NOT EXISTS idx_reviews_dish ON reviews(dish_id);
CREATE INDEX IF NOT EXISTS idx_weekly_menus_week ON weekly_menus(week_start_date);

-- Verify the changes
SELECT 'Locations with portion settings:' as info;
SELECT id, name, soup_portion_ml, salad_bar_portion_grams FROM locations;

SELECT 'Available allergens:' as info;
SELECT name, icon, color FROM allergens ORDER BY name;
