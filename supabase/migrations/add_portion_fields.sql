-- Add portion unit and portion size fields to dishes table

-- Create enum type for portion units
CREATE TYPE portion_unit AS ENUM ('pieces', 'grams', 'kilograms', 'milliliters', 'liters', 'trays');

-- Add portion fields to dishes table
ALTER TABLE dishes
ADD COLUMN portion_unit portion_unit,
ADD COLUMN portion_size DECIMAL(10,2);

-- Add comment explaining the fields
COMMENT ON COLUMN dishes.portion_unit IS 'Unit of measurement for portion sizes (pieces, grams, kilograms, milliliters, liters, trays)';
COMMENT ON COLUMN dishes.portion_size IS 'Size of one portion in the specified unit (e.g., 150 for 150ml or 220 for 220g)';
