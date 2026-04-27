-- Allow authenticated users (including operational users) to update their tenant's profile photos
-- This is needed because PhotoUpload uses upsert: true
CREATE POLICY "Authenticated users can update profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = (public.get_user_empresa_id())::text
)
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = (public.get_user_empresa_id())::text
);

-- Same for pet-media
CREATE POLICY "Authenticated users can update pet media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pet-media'
  AND (storage.foldername(name))[1] = (public.get_user_empresa_id())::text
)
WITH CHECK (
  bucket_id = 'pet-media'
  AND (storage.foldername(name))[1] = (public.get_user_empresa_id())::text
);