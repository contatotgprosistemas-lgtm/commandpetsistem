DROP POLICY "Users update own profile" ON public.profiles;

CREATE POLICY "Users update own profile except cargo"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND cargo IS NOT DISTINCT FROM (SELECT p.cargo FROM public.profiles p WHERE p.user_id = auth.uid())
);