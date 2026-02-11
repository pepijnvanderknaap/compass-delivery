-- Create customer_feedback table for QR code-based feedback system
CREATE TABLE IF NOT EXISTS customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  submission_ip VARCHAR(45) NOT NULL,

  -- Dish ratings (null if dish not available that day)
  soup_rating INTEGER CHECK (soup_rating IN (25, 50, 75, 100)),
  hot_meat_rating INTEGER CHECK (hot_meat_rating IN (25, 50, 75, 100)),
  hot_veg_rating INTEGER CHECK (hot_veg_rating IN (25, 50, 75, 100)),
  salad_bar_rating INTEGER CHECK (salad_bar_rating IN (25, 50, 75, 100)),
  sandwich_rating INTEGER CHECK (sandwich_rating IN (25, 50, 75, 100)),

  -- Operational ratings (always present)
  price_quality_rating INTEGER NOT NULL CHECK (price_quality_rating IN (25, 50, 75, 100)),
  portion_size_rating INTEGER NOT NULL CHECK (portion_size_rating IN (25, 50, 75, 100)),
  service_speed_rating INTEGER NOT NULL CHECK (service_speed_rating IN (25, 50, 75, 100)),
  cleanliness_rating INTEGER NOT NULL CHECK (cleanliness_rating IN (25, 50, 75, 100)),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Enforce one submission per IP per day per location
  CONSTRAINT unique_ip_per_day_location UNIQUE (location_id, submission_date, submission_ip)
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_feedback_location_date ON customer_feedback(location_id, submission_date);
CREATE INDEX IF NOT EXISTS idx_feedback_date ON customer_feedback(submission_date);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON customer_feedback(created_at);

-- Add comment explaining the table
COMMENT ON TABLE customer_feedback IS 'Customer feedback submissions from QR code forms at each location. Ratings scale: Poor=25, Mediocre=50, Good=75, Excellent=100';
