-- Tabela para ordem da rota diária do motorista (lista única do dia)
CREATE TABLE IF NOT EXISTS public.taxipet_rota_ordem (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  periodo TEXT NOT NULL CHECK (periodo IN ('manha_buscar','tarde_levar','banho_buscar','banho_levar')),
  booking_id UUID NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('transport','agendamento')),
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, data, periodo, booking_id, source)
);

CREATE INDEX IF NOT EXISTS idx_taxipet_rota_lookup ON public.taxipet_rota_ordem (empresa_id, data, periodo, ordem);

ALTER TABLE public.taxipet_rota_ordem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa can view rota"
ON public.taxipet_rota_ordem FOR SELECT
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa can insert rota"
ON public.taxipet_rota_ordem FOR INSERT
WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa can update rota"
ON public.taxipet_rota_ordem FOR UPDATE
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa can delete rota"
ON public.taxipet_rota_ordem FOR DELETE
USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER update_taxipet_rota_ordem_updated_at
BEFORE UPDATE ON public.taxipet_rota_ordem
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();