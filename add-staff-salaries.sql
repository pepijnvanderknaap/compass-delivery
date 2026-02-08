-- Add salary and hours fields to location_staff table
ALTER TABLE location_staff
ADD COLUMN IF NOT EXISTS gross_monthly_salary DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS contractual_hours INTEGER DEFAULT 40; -- Full-time default

-- Add salary and hours fields for site manager in location_settings
ALTER TABLE location_settings
ADD COLUMN IF NOT EXISTS site_manager_gross_monthly_salary DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS site_manager_contractual_hours INTEGER DEFAULT 40; -- Full-time default

-- Remove the old simple staff_cost_per_day field from billing settings
-- We'll calculate this dynamically based on actual staff
ALTER TABLE location_billing_settings
DROP COLUMN IF EXISTS staff_cost_per_day;

-- Add Dutch employer cost configuration (as percentages)
ALTER TABLE location_billing_settings
ADD COLUMN IF NOT EXISTS employer_social_security_percentage DECIMAL(5,2) DEFAULT 17.90, -- Werkgeverslasten
ADD COLUMN IF NOT EXISTS pension_contribution_percentage DECIMAL(5,2) DEFAULT 8.00, -- Pensioen
ADD COLUMN IF NOT EXISTS holiday_allowance_percentage DECIMAL(5,2) DEFAULT 8.00, -- Vakantiegeld (8% in NL)
ADD COLUMN IF NOT EXISTS other_employer_costs_percentage DECIMAL(5,2) DEFAULT 2.00; -- Other costs (insurance, etc.)

-- Total Dutch employer costs typically range from 25-35% on top of gross salary
-- Default total: 17.9 + 8.0 + 8.0 + 2.0 = 35.9%
