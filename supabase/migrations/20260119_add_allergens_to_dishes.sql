-- Add allergen fields to dishes table
ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS allergen_gluten BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergen_soy BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergen_lactose BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergen_sesame BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergen_sulphites BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergen_egg BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergen_mustard BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergen_celery BOOLEAN DEFAULT false;

-- Update category field to have more specific options
-- Note: You'll need to manually update existing dish categories after running this migration
