-- Check what salads exist and their current state
SELECT 
  id,
  category,
  custom_name as name,
  display_number,
  description
FROM salad_combinations
ORDER BY category, custom_name;
