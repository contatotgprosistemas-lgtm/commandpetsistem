
-- 1) operational_users.pin: revoke read from authenticated. PINs are hashed; verification goes through verify_operational_pin RPC (security definer).
REVOKE SELECT (pin) ON public.operational_users FROM authenticated, anon;

-- 2) asaas_contas.api_key: tighten policy — drop gerente from SELECT.
DROP POLICY IF EXISTS "Admin/Gerente can view asaas_contas" ON public.asaas_contas;
CREATE POLICY "Admin can view asaas_contas"
ON public.asaas_contas FOR SELECT TO authenticated
USING (
  empresa_id = public.get_user_empresa_id()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- 3) contracts.signing_token + token_expires_at: revoke direct read from authenticated; expose through SECURITY DEFINER RPC restricted to admin/gerente of the empresa.
REVOKE SELECT (signing_token, token_expires_at) ON public.contracts FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_contract_signing_token(p_contract_id uuid)
RETURNS TABLE(signing_token text, token_expires_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa uuid;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.contracts WHERE id = p_contract_id;
  IF v_empresa IS NULL THEN
    RETURN;
  END IF;

  IF v_empresa <> public.get_user_empresa_id() THEN
    RETURN;
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.signing_token, c.token_expires_at
  FROM public.contracts c
  WHERE c.id = p_contract_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contract_signing_token(uuid) TO authenticated;

-- 4) clientes.edit_token: revoke direct read; expose through SECURITY DEFINER RPC that creates one if missing.
REVOKE SELECT (edit_token) ON public.clientes FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_or_create_cliente_edit_token(p_cliente_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa uuid;
  v_token text;
BEGIN
  SELECT empresa_id, edit_token INTO v_empresa, v_token
  FROM public.clientes WHERE id = p_cliente_id;
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  IF v_empresa <> public.get_user_empresa_id() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF v_token IS NULL OR v_token = '' THEN
    v_token := encode(gen_random_bytes(24), 'hex');
    UPDATE public.clientes SET edit_token = v_token WHERE id = p_cliente_id;
  END IF;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_cliente_edit_token(uuid) TO authenticated;
