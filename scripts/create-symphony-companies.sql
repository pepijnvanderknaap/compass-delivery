-- Symphony Companies (Office Manager Authentication)
CREATE TABLE IF NOT EXISTS symphony_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL UNIQUE,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  pin_code TEXT NOT NULL, -- Simple 4-digit PIN for authentication
  floor_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_symphony_companies_company_name ON symphony_companies(company_name);
CREATE INDEX IF NOT EXISTS idx_symphony_companies_active ON symphony_companies(is_active);

-- Insert TCS test account
INSERT INTO symphony_companies (company_name, contact_name, contact_email, contact_phone, pin_code, floor_number)
VALUES ('TCS', 'TCS Office Manager', 'tcs@symphony.com', '+31 20 123 4567', '1234', '5')
ON CONFLICT (company_name) DO NOTHING;

COMMENT ON TABLE symphony_companies IS 'Companies/tenants in Symphony building for banqueting orders';
COMMENT ON COLUMN symphony_companies.pin_code IS 'Simple 4-digit PIN for office manager authentication';
