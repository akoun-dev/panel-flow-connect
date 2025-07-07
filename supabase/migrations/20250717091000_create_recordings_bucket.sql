-- Create bucket for session recordings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'recordings'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('recordings', 'recordings', false);
  END IF;
END;
$$;

-- Ensure RLS is enabled on storage.objects
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to recordings
-- Politique de lecture publique pour les fichiers dans le bucket "recordings"
DROP POLICY IF EXISTS "Public read recordings" ON storage.objects;

CREATE POLICY "Public read recordings" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'recordings');

