CREATE POLICY "Admin can update empresa profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  empresa_id = get_user_empresa_id()
  AND has_role(auth.uid(), 'admin')
)
WITH CHECK (
  empresa_id = get_user_empresa_id()
  AND has_role(auth.uid(), 'admin')
);