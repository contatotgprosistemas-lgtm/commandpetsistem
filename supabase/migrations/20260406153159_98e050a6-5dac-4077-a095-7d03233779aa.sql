GRANT SELECT ON TABLE public.operational_users TO authenticated;

ALTER TABLE public.operational_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operational users can read own record" ON public.operational_users;
CREATE POLICY "Operational users can read own record"
ON public.operational_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());