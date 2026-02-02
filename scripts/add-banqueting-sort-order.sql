-- Add sort_order column to banqueting_items
ALTER TABLE banqueting_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for sort_order
CREATE INDEX IF NOT EXISTS idx_banqueting_items_sort_order ON banqueting_items(category, sort_order);

-- Initialize sort_order for existing items (ordered by name)
UPDATE banqueting_items
SET sort_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY category ORDER BY name) as row_num
  FROM banqueting_items
) AS subquery
WHERE banqueting_items.id = subquery.id;
