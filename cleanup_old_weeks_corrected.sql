-- Cleanup old week records (CORRECTED DATES)
-- Today is Wednesday Jan 21, 2026, so current week starts Monday Jan 19

-- Current 4 weeks should be:
-- Week 1 (current): 2026-01-19 (Mon Jan 19 - Fri Jan 23)
-- Week 2: 2026-01-26 (Mon Jan 26 - Fri Jan 30)
-- Week 3: 2026-02-02 (Mon Feb 2 - Fri Feb 6)
-- Week 4: 2026-02-09 (Mon Feb 9 - Fri Feb 13)

SELECT
  l.name as location_name,
  o.week_start_date,
  CASE
    WHEN o.week_start_date >= '2026-01-19' AND o.week_start_date <= '2026-02-09' THEN 'KEEP'
    ELSE 'DELETE'
  END as action
FROM orders o
JOIN locations l ON l.id = o.location_id
ORDER BY l.name, o.week_start_date;

-- To execute the cleanup, uncomment the line below:
-- DELETE FROM orders WHERE week_start_date < '2026-01-19' OR week_start_date > '2026-02-09';
