
CREATE TABLE public.taxas_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'cartao_credito',
  bandeira TEXT,
  parcelas_de INT DEFAULT 1,
  parcelas_ate INT DEFAULT 1,
  percentual NUMERIC(6,4) NOT NULL DEFAULT 0,
  valor_fixo NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.taxas_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company fees"
  ON public.taxas_financeiras FOR SELECT
  TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Users can insert own company fees"
  ON public.taxas_financeiras FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Users can update own company fees"
  ON public.taxas_financeiras FOR UPDATE
  TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Users can delete own company fees"
  ON public.taxas_financeiras FOR DELETE
  TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER update_taxas_financeiras_updated_at
  BEFORE UPDATE ON public.taxas_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
