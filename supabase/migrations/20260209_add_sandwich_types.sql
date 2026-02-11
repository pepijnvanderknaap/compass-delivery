-- Add sandwich protein and vegan fields to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS sandwich_protein_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sandwich_protein_price DECIMAL(10,2) DEFAULT 3.10,
ADD COLUMN IF NOT EXISTS sandwich_vegan_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sandwich_vegan_price DECIMAL(10,2) DEFAULT 3.10;
