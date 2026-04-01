
-- Fix ponto-selfies: replace broad SELECT with tenant-scoped
DROP POLICY IF EXISTS "Authenticated read ponto selfies" ON storage.objects;
CREATE POLICY "Tenant read ponto selfies" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'ponto-selfies' AND (storage.foldername(name))[1] = get_user_empresa_id()::text);

-- Fix chat-media: replace broad SELECT with tenant-scoped
DROP POLICY IF EXISTS "Anyone can read chat media" ON storage.objects;
CREATE POLICY "Tenant read chat media" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = get_user_empresa_id()::text);

-- Remove anon contract policies (signing moves to edge function)
DROP POLICY IF EXISTS "Anon can update on sign" ON public.contracts;
DROP POLICY IF EXISTS "Public token access" ON public.contracts;

-- Remove anon contract_signatures insert (will be done server-side)
DROP POLICY IF EXISTS "Anon can insert sig" ON public.contract_signatures;

-- Remove anon contract_events insert policies if any exist
DROP POLICY IF EXISTS "Anon can insert event" ON public.contract_events;
