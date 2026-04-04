
CREATE TABLE public.asaas_contas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Conta Principal',
  api_key text NOT NULL,
  teto_mensal numeric NULL,
  prioridade integer NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.asaas_contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.asaas_contas FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.asaas_contas FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.asaas_contas FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.asaas_contas FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

CREATE UNIQUE INDEX idx_asaas_contas_empresa_prioridade ON public.asaas_contas (empresa_id, prioridade);

CREATE TRIGGER update_asaas_contas_updated_at BEFORE UPDATE ON public.asaas_contas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
