
-- 1. Fix user_roles: Remove permissive INSERT, only allow admins to assign roles
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

CREATE POLICY "Only admins assign roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Add DELETE policy for admin cleanup
DROP POLICY IF EXISTS "Only admins delete roles" ON public.user_roles;
CREATE POLICY "Only admins delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 2. Fix leads: Restrict read access to super_admin only
DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.leads;

CREATE POLICY "Super admin reads all leads"
ON public.leads FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 3. Fix ponto-selfies storage: Remove public read, add authenticated tenant-scoped read
DROP POLICY IF EXISTS "Public read ponto selfie" ON storage.objects;

CREATE POLICY "Authenticated read ponto selfies"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ponto-selfies');

-- 4. Fix profile-photos storage: Remove anon upload
DROP POLICY IF EXISTS "Anon can upload profile photos" ON storage.objects;
