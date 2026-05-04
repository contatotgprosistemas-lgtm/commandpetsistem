
-- 1. Add dia_vencimento_fatura to empresa_modulos
ALTER TABLE public.empresa_modulos
  ADD COLUMN IF NOT EXISTS dia_vencimento_fatura INT NOT NULL DEFAULT 10
    CHECK (dia_vencimento_fatura BETWEEN 1 AND 28);

-- 2. sistema_asaas_config (singleton)
CREATE TABLE IF NOT EXISTS public.sistema_asaas_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT,
  ambiente TEXT NOT NULL DEFAULT 'sandbox' CHECK (ambiente IN ('sandbox','production')),
  pix_habilitado BOOLEAN NOT NULL DEFAULT true,
  boleto_habilitado BOOLEAN NOT NULL DEFAULT true,
  webhook_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sistema_asaas_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access sistema_asaas_config"
  ON public.sistema_asaas_config FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_sistema_asaas_config_updated
  BEFORE UPDATE ON public.sistema_asaas_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. faturas_sistema
CREATE TABLE IF NOT EXISTS public.faturas_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  competencia DATE NOT NULL,
  vencimento DATE NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','vencido','cancelado')),
  asaas_charge_id TEXT,
  asaas_invoice_url TEXT,
  pix_qr_code TEXT,
  pix_copia_cola TEXT,
  linha_digitavel_boleto TEXT,
  boleto_url TEXT,
  data_pagamento DATE,
  forma_pagamento TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, competencia)
);

CREATE INDEX IF NOT EXISTS idx_faturas_sistema_empresa ON public.faturas_sistema(empresa_id);
CREATE INDEX IF NOT EXISTS idx_faturas_sistema_status ON public.faturas_sistema(status);

ALTER TABLE public.faturas_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access faturas_sistema"
  ON public.faturas_sistema FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admin empresa view faturas_sistema"
  ON public.faturas_sistema FOR SELECT
  USING (
    empresa_id = public.get_user_empresa_id()
    AND public.get_own_cargo() = 'admin'
  );

CREATE TRIGGER trg_faturas_sistema_updated
  BEFORE UPDATE ON public.faturas_sistema
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
