CREATE OR REPLACE FUNCTION public.get_user_setor_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT setor_id FROM public.crm_setor_atendentes WHERE user_id = auth.uid()
$$;