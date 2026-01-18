-- Allow managers to create bespoke (off_menu) dishes
-- This policy allows INSERT operations on dishes table for off_menu category

CREATE POLICY "Managers can create bespoke dishes"
ON dishes
FOR INSERT
TO authenticated
WITH CHECK (category = 'off_menu');

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'dishes';
