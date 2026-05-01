
-- 1. Add fuel-related fields to vehicles
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS consumo_km_litro numeric,
  ADD COLUMN IF NOT EXISTS tipo_combustivel text;

-- 2. combustivel_precos table (historic price tracking)
CREATE TABLE IF NOT EXISTS public.combustivel_precos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo_combustivel text NOT NULL,
  preco_litro numeric NOT NULL,
  data_referencia date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_combustivel_precos_empresa ON public.combustivel_precos(empresa_id, tipo_combustivel, data_referencia DESC);

ALTER TABLE public.combustivel_precos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "combustivel_precos_select" ON public.combustivel_precos;
DROP POLICY IF EXISTS "combustivel_precos_insert" ON public.combustivel_precos;
DROP POLICY IF EXISTS "combustivel_precos_update" ON public.combustivel_precos;
DROP POLICY IF EXISTS "combustivel_precos_delete" ON public.combustivel_precos;

CREATE POLICY "combustivel_precos_select" ON public.combustivel_precos
  FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "combustivel_precos_insert" ON public.combustivel_precos
  FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "combustivel_precos_update" ON public.combustivel_precos
  FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "combustivel_precos_delete" ON public.combustivel_precos
  FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

CREATE TRIGGER update_combustivel_precos_updated_at
  BEFORE UPDATE ON public.combustivel_precos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. taxipet_roteirizacoes table
CREATE TABLE IF NOT EXISTS public.taxipet_roteirizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  tipo text NOT NULL CHECK (tipo IN ('buscar','levar')),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  origem_endereco text,
  destino_endereco text,
  paradas jsonb NOT NULL DEFAULT '[]'::jsonb,
  km_estimado numeric,
  km_real numeric,
  litros_consumidos numeric,
  custo_combustivel numeric,
  receita_total numeric NOT NULL DEFAULT 0,
  lucro_estimado numeric,
  preco_litro_usado numeric,
  consumo_km_litro_usado numeric,
  status text NOT NULL DEFAULT 'planejada' CHECK (status IN ('planejada','em_andamento','concluida','cancelada')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finalizada_em timestamptz
);
CREATE INDEX IF NOT EXISTS idx_taxipet_roteirizacoes_empresa_data ON public.taxipet_roteirizacoes(empresa_id, data DESC);

ALTER TABLE public.taxipet_roteirizacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "taxipet_roteirizacoes_select" ON public.taxipet_roteirizacoes;
DROP POLICY IF EXISTS "taxipet_roteirizacoes_insert" ON public.taxipet_roteirizacoes;
DROP POLICY IF EXISTS "taxipet_roteirizacoes_update" ON public.taxipet_roteirizacoes;
DROP POLICY IF EXISTS "taxipet_roteirizacoes_delete" ON public.taxipet_roteirizacoes;

CREATE POLICY "taxipet_roteirizacoes_select" ON public.taxipet_roteirizacoes
  FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "taxipet_roteirizacoes_insert" ON public.taxipet_roteirizacoes
  FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "taxipet_roteirizacoes_update" ON public.taxipet_roteirizacoes
  FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "taxipet_roteirizacoes_delete" ON public.taxipet_roteirizacoes
  FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

CREATE TRIGGER update_taxipet_roteirizacoes_updated_at
  BEFORE UPDATE ON public.taxipet_roteirizacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
