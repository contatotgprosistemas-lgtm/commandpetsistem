DROP POLICY IF EXISTS "Users update own profile except cargo" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_own_cargo()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cargo FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE POLICY "Users update own profile except cargo"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND cargo IS NOT DISTINCT FROM get_own_cargo()
);