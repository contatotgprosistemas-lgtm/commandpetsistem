
-- 1) signup_source
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_source text;

-- Backfill: existing admins linked to a company are treated as self_signup so super admin
-- still sees pending approvals for them; everyone else stays NULL.
UPDATE public.profiles
SET signup_source = 'self_signup'
WHERE signup_source IS NULL
  AND empresa_id IS NOT NULL
  AND cargo = 'admin';

-- 2) handle_new_user — write signup_source
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _empresa_name TEXT;
  _empresa_id UUID;
  _signup_source TEXT;
BEGIN
  _empresa_name := NEW.raw_user_meta_data->>'empresa';

  IF _empresa_name IS NOT NULL AND _empresa_name <> '' THEN
    INSERT INTO public.empresas (nome_empresa)
    VALUES (_empresa_name)
    RETURNING id INTO _empresa_id;
    _signup_source := 'self_signup';
  ELSE
    _signup_source := COALESCE(NEW.raw_user_meta_data->>'signup_source', NULL);
  END IF;

  INSERT INTO public.profiles (user_id, nome, email, empresa_id, cargo, signup_source, aprovado)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    _empresa_id,
    CASE WHEN _empresa_id IS NOT NULL THEN 'admin' ELSE NULL END,
    _signup_source,
    CASE WHEN _signup_source = 'self_signup' THEN false ELSE true END
  );

  IF _empresa_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) empresa_modulos table
CREATE TABLE IF NOT EXISTS public.empresa_modulos (
  empresa_id uuid PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  modulo_banho_tosa boolean NOT NULL DEFAULT false,
  modulo_hotel_creche boolean NOT NULL DEFAULT false,
  modulo_ponto boolean NOT NULL DEFAULT false,
  valor_mensal numeric(10,2) NOT NULL DEFAULT 0,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.empresa_modulos ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "empresa_modulos super admin all"
ON public.empresa_modulos
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Admin/gerente of the company: read-only their own row
CREATE POLICY "empresa_modulos admin read own"
ON public.empresa_modulos
FOR SELECT
TO authenticated
USING (empresa_id = public.get_user_empresa_id());

-- updated_at trigger
CREATE TRIGGER trg_empresa_modulos_updated
BEFORE UPDATE ON public.empresa_modulos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: every existing empresa starts with all modules enabled (combo completo)
INSERT INTO public.empresa_modulos (empresa_id, modulo_banho_tosa, modulo_hotel_creche, modulo_ponto, valor_mensal)
SELECT id, true, true, true, 247.00
FROM public.empresas
ON CONFLICT (empresa_id) DO NOTHING;

-- 4) Helper definer to read modules without leaking via RLS
CREATE OR REPLACE FUNCTION public.get_empresa_modulos_flags(p_empresa_id uuid)
RETURNS TABLE(
  modulo_banho_tosa boolean,
  modulo_hotel_creche boolean,
  modulo_ponto boolean,
  valor_mensal numeric,
  data_inicio date,
  data_fim date
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT modulo_banho_tosa, modulo_hotel_creche, modulo_ponto, valor_mensal, data_inicio, data_fim
  FROM public.empresa_modulos
  WHERE empresa_id = p_empresa_id
$function$;

REVOKE EXECUTE ON FUNCTION public.get_empresa_modulos_flags(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_empresa_modulos_flags(uuid) TO authenticated;
