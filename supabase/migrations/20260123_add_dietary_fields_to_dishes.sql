-- Add dietary and protein category fields to dishes table
ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS contains_pork BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contains_beef BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contains_lamb BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_vegetarian BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_vegan BOOLEAN DEFAULT false;
