
-- Allow anon uploads to profile-photos only in the public-cadastro/ path
CREATE POLICY "Anon upload public cadastro photos"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = 'public-cadastro'
);
