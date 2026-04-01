
-- 1. FIX: Anonymous contract UPDATE - use trigger to prevent content modification
CREATE OR REPLACE FUNCTION public.prevent_anon_contract_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the update is from anon (no authenticated user), only allow status and signed_at changes
  IF auth.uid() IS NULL THEN
    -- Prevent changes to sensitive fields
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
       OR NEW.empresa_id IS DISTINCT FROM OLD.empresa_id
       OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
       OR NEW.template_id IS DISTINCT FROM OLD.template_id
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.signing_token IS DISTINCT FROM OLD.signing_token
       OR NEW.token_expires_at IS DISTINCT FROM OLD.token_expires_at
       OR NEW.sent_at IS DISTINCT FROM OLD.sent_at
       OR NEW.pdf_url IS DISTINCT FROM OLD.pdf_url
    THEN
      RAISE EXCEPTION 'Anonymous users can only update status and signed_at';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_anon_contract_modification ON public.contracts;
CREATE TRIGGER prevent_anon_contract_modification
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_anon_contract_modification();

-- 2. FIX: Operational users RLS - restrict to admins
DROP POLICY IF EXISTS "Admins can manage operational users" ON public.operational_users;

CREATE POLICY "Admins can manage operational users"
ON public.operational_users FOR ALL
TO authenticated
USING (
  empresa_id = get_user_empresa_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
)
WITH CHECK (
  empresa_id = get_user_empresa_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

-- 3. FIX: Hash PINs with pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash existing plaintext PINs
UPDATE public.operational_users
SET pin = crypt(pin, gen_salt('bf'))
WHERE pin IS NOT NULL AND pin != '' AND pin NOT LIKE '$2a$%' AND pin NOT LIKE '$2b$%';

-- Create secure PIN verification function
CREATE OR REPLACE FUNCTION public.verify_operational_pin(p_email text, p_pin text, p_empresa_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM public.operational_users
  WHERE email = p_email
    AND empresa_id = p_empresa_id
    AND ativo = true
    AND pin IS NOT NULL
    AND pin = crypt(p_pin, pin);
  
  RETURN v_user_id;
END;
$$;

-- Create function to hash PIN on insert/update
CREATE OR REPLACE FUNCTION public.hash_operational_pin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pin IS NOT NULL AND NEW.pin != '' AND NEW.pin NOT LIKE '$2a$%' AND NEW.pin NOT LIKE '$2b$%' THEN
    NEW.pin = crypt(NEW.pin, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hash_operational_pin ON public.operational_users;
CREATE TRIGGER hash_operational_pin
  BEFORE INSERT OR UPDATE OF pin ON public.operational_users
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_operational_pin();

-- 4. FIX: Storage tenant isolation - add empresa_id path scoping

-- Pet media: scope write/delete to tenant path
DROP POLICY IF EXISTS "Authenticated users can upload pet media" ON storage.objects;
CREATE POLICY "Authenticated users can upload pet media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pet-media'
  AND (storage.foldername(name))[1] = get_user_empresa_id()::text
);

DROP POLICY IF EXISTS "Authenticated users can delete pet media" ON storage.objects;
CREATE POLICY "Authenticated users can delete pet media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'pet-media'
  AND (storage.foldername(name))[1] = get_user_empresa_id()::text
);

-- Profile photos: scope write/delete to tenant path
DROP POLICY IF EXISTS "Authenticated users can upload profile photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload profile photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = get_user_empresa_id()::text
);

DROP POLICY IF EXISTS "Authenticated users can delete profile photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete profile photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = get_user_empresa_id()::text
);

-- Chat media: scope write/delete to tenant path
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[1] = get_user_empresa_id()::text
);

DROP POLICY IF EXISTS "Users can delete own chat media" ON storage.objects;
CREATE POLICY "Users can delete own chat media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[1] = get_user_empresa_id()::text
);

-- Ponto selfies: scope write/delete to tenant path
DROP POLICY IF EXISTS "Auth upload ponto selfie" ON storage.objects;
CREATE POLICY "Auth upload ponto selfie"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ponto-selfies'
  AND (storage.foldername(name))[1] = get_user_empresa_id()::text
);

DROP POLICY IF EXISTS "Auth delete ponto selfie" ON storage.objects;
CREATE POLICY "Auth delete ponto selfie"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ponto-selfies'
  AND (storage.foldername(name))[1] = get_user_empresa_id()::text
);
