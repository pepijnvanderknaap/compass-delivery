-- Add fish and shellfish allergen columns to dishes table
ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS allergen_fish BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergen_shellfish BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN dishes.allergen_fish IS 'Indicates if dish contains fish allergen';
COMMENT ON COLUMN dishes.allergen_shellfish IS 'Indicates if dish contains shellfish allergen';
