-- Check Kitchen location
SELECT id, name FROM locations WHERE name = 'Kitchen';

-- Check Kitchen settings
SELECT 
  site_manager_name,
  site_manager_gross_monthly_salary,
  kitchen_manager_2_name,
  kitchen_manager_2_gross_monthly_salary
FROM location_settings 
WHERE location_id = (SELECT id FROM locations WHERE name = 'Kitchen');

-- Check Kitchen staff
SELECT 
  staff_name,
  staff_role,
  gross_monthly_salary,
  contractual_hours
FROM location_staff 
WHERE location_id = (SELECT id FROM locations WHERE name = 'Kitchen');
