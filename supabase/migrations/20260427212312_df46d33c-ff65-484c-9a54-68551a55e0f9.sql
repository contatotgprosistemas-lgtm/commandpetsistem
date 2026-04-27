CREATE TABLE public.data_retention_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE,
  crm_media_retention_days integer NOT NULL DEFAULT 60,
  crm_message_retention_days integer NOT NULL DEFAULT 180,
  audit_log_retention_days integer NOT NULL DEFAULT 180,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_run_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_retention_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage retention config of their empresa"
ON public.data_retention_config
FOR ALL
USING (
  empresa_id = public.get_user_empresa_id()
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente') OR public.has_role(auth.uid(),'super_admin'))
)
WITH CHECK (
  empresa_id = public.get_user_empresa_id()
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente') OR public.has_role(auth.uid(),'super_admin'))
);

CREATE TRIGGER update_data_retention_config_updated_at
BEFORE UPDATE ON public.data_retention_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();