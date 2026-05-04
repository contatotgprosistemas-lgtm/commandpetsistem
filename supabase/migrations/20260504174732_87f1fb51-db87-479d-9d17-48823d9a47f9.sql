CREATE OR REPLACE FUNCTION public.get_contract_signing_token(p_contract_id uuid)
 RETURNS TABLE(signing_token text, token_expires_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa uuid;
  v_cliente uuid;
BEGIN
  SELECT empresa_id, cliente_id INTO v_empresa, v_cliente
  FROM public.contracts WHERE id = p_contract_id;
  IF v_empresa IS NULL THEN
    RETURN;
  END IF;

  -- Cliente dono pode obter o próprio token
  IF v_cliente = public.get_user_cliente_id() THEN
    RETURN QUERY SELECT c.signing_token, c.token_expires_at FROM public.contracts c WHERE c.id = p_contract_id;
    RETURN;
  END IF;

  -- Qualquer membro (admin/gerente/operacional/recepcao etc.) da mesma empresa
  IF v_empresa = public.get_user_empresa_id() THEN
    RETURN QUERY SELECT c.signing_token, c.token_expires_at FROM public.contracts c WHERE c.id = p_contract_id;
    RETURN;
  END IF;

  RETURN;
END;
$function$;