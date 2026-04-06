DROP POLICY IF EXISTS "Operational users can read own record" ON public.operational_users;
CREATE POLICY "Operational users can read own record"
ON public.operational_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());