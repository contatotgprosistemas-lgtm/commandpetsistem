CREATE TABLE public.metas_faturamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  valor_meta NUMERIC NOT NULL DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, ano, mes)
);

CREATE INDEX idx_metas_faturamento_empresa_periodo
  ON public.metas_faturamento (empresa_id, ano, mes);

ALTER TABLE public.metas_faturamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.metas_faturamento
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Tenant isolation insert" ON public.metas_faturamento
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Tenant isolation update" ON public.metas_faturamento
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Tenant isolation delete" ON public.metas_faturamento
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER update_metas_faturamento_updated_at
  BEFORE UPDATE ON public.metas_faturamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();