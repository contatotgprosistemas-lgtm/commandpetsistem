CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT empresa_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    (SELECT empresa_id FROM public.operational_users WHERE user_id = auth.uid() AND ativo = true LIMIT 1)
  )
$function$;