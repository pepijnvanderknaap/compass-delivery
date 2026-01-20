-- Update portion sizes for the sample dishes
UPDATE dishes
SET default_portion_size_ml = 250
WHERE id = '4a0ca1d5-bb32-49fd-be56-8d7a83ba9262'; -- Mulligatawny soup (250ml per portion)

UPDATE dishes
SET default_portion_size_g = 350
WHERE id = 'a49fdf50-f04b-46b0-9d9b-369446f699ff'; -- Chicken Biryani (350g per portion)

UPDATE dishes
SET default_portion_size_g = 350
WHERE id = 'c74cdcc6-00b8-498f-8c55-0b93771b6ba1'; -- Mixed Veg Biryani (350g per portion)

-- Update common component portion sizes
UPDATE dishes
SET default_portion_size_g = 30
WHERE name = 'Coriander'; -- 30g per portion

UPDATE dishes
SET default_portion_size_ml = 15
WHERE name = 'Chilli Oil'; -- 15ml per portion

UPDATE dishes
SET default_portion_size_g = 80
WHERE name = 'Indian Coleslaw'; -- 80g per portion

UPDATE dishes
SET default_portion_size_g = 50
WHERE name = 'Cucumber Raita'; -- 50g per portion

UPDATE dishes
SET default_portion_size_g = 60
WHERE name = 'Naan Bread'; -- 60g per portion
