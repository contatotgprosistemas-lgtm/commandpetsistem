CREATE POLICY "Super admins can view all clientes"
ON public.clientes FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
);