-- Allow anonymous/public users to read only logo_url from empresas by ID
CREATE OR REPLACE FUNCTION public.get_empresa_logo(p_empresa_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT logo_url FROM public.empresas WHERE id = p_empresa_id;
$$;