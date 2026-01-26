-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload files to the dishes bucket
CREATE POLICY "Allow authenticated users to upload dish photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dishes');

-- Allow authenticated users to update their uploaded files
CREATE POLICY "Allow authenticated users to update dish photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'dishes');

-- Allow authenticated users to delete files from dishes bucket
CREATE POLICY "Allow authenticated users to delete dish photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'dishes');

-- Allow public read access to dishes bucket (since photos need to be viewable)
CREATE POLICY "Allow public read access to dish photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'dishes');
