-- Allow authenticated users to insert empresas (for onboarding)
CREATE POLICY "Users can create empresa" ON public.empresas
FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow empresa owner to update
CREATE POLICY "Users can update own empresa" ON public.empresas
FOR UPDATE TO authenticated
USING (id = get_user_empresa_id());

-- Allow users to insert their own role during onboarding
CREATE POLICY "Users can insert own role" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
