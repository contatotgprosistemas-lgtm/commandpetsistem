
-- Add foto_url to clientes and pets
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS foto_url text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS foto_url text;

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to profile-photos bucket
CREATE POLICY "Authenticated users can upload profile photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-photos');

-- Allow public read access
CREATE POLICY "Public read access for profile photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-photos');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete profile photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-photos');

-- Allow anon uploads for public registration
CREATE POLICY "Anon can upload profile photos"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'profile-photos');
