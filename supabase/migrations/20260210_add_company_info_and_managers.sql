-- Add company contact information to symphony_companies table
ALTER TABLE symphony_companies
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS main_telephone VARCHAR(50);

-- Create table for office managers (multiple per company)
CREATE TABLE IF NOT EXISTS symphony_office_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES symphony_companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telephone VARCHAR(50),
  department VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster lookups by company
CREATE INDEX IF NOT EXISTS idx_symphony_office_managers_company_id ON symphony_office_managers(company_id);

-- Add sample data for TCS
UPDATE symphony_companies
SET
  address = '1234 Tech Plaza, Amsterdam, 1012 AB, Netherlands',
  main_telephone = '+31 20 123 4567'
WHERE company_name = 'TCS';

-- Add sample office managers for TCS
INSERT INTO symphony_office_managers (company_id, name, email, telephone, department)
SELECT
  id,
  'Rajesh Kumar',
  'rajesh.kumar@tcs.com',
  '+31 20 123 4568',
  'Operations'
FROM symphony_companies
WHERE company_name = 'TCS'
ON CONFLICT DO NOTHING;

INSERT INTO symphony_office_managers (company_id, name, email, telephone, department)
SELECT
  id,
  'Priya Sharma',
  'priya.sharma@tcs.com',
  '+31 20 123 4569',
  'Finance'
FROM symphony_companies
WHERE company_name = 'TCS'
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN symphony_companies.address IS 'Company physical address';
COMMENT ON COLUMN symphony_companies.main_telephone IS 'Main company telephone number';
COMMENT ON TABLE symphony_office_managers IS 'Office managers for symphony tenant companies';
