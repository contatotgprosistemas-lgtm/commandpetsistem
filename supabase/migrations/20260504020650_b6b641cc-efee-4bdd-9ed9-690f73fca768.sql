CREATE POLICY "Super admin views all empresas"
ON public.empresas FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));