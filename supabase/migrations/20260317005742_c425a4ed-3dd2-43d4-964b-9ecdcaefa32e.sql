
DROP POLICY IF EXISTS "Users can create empresa" ON public.empresas;
CREATE POLICY "Users can create empresa" ON public.empresas
  FOR INSERT TO authenticated
  WITH CHECK (id = get_user_empresa_id());
