-- Fix product reference to use existing banqueting_items table

-- Drop the old foreign key constraint
ALTER TABLE symphony_banqueting_timeslot_items
DROP CONSTRAINT IF EXISTS symphony_banqueting_timeslot_items_product_id_fkey;

-- Add the new foreign key constraint pointing to banqueting_items
ALTER TABLE symphony_banqueting_timeslot_items
ADD CONSTRAINT symphony_banqueting_timeslot_items_product_id_fkey
FOREIGN KEY (product_id) REFERENCES banqueting_items(id);
