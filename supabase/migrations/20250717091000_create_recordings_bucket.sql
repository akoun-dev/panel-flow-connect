-- Create bucket for session recordings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'recordings'
  ) THEN
    PERFORM storage.create_bucket('recordings', public := false);
  END IF;
END;
$$;

-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to recordings
CREATE POLICY "Public read recordings" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'recordings');

