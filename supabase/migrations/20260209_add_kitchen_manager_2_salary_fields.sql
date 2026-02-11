-- Add Kitchen Manager 2 salary and hours fields to location_settings table
ALTER TABLE location_settings
ADD COLUMN IF NOT EXISTS kitchen_manager_2_gross_monthly_salary DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS kitchen_manager_2_contractual_hours INTEGER;
