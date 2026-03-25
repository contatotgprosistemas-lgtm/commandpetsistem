
-- Helper function to get operational user id
CREATE OR REPLACE FUNCTION public.get_operational_user_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.operational_users WHERE user_id = auth.uid() LIMIT 1 $$;

-- Company work schedule configuration
CREATE TABLE public.ponto_configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  jornada_diaria_min integer NOT NULL DEFAULT 480,
  intervalo_min integer NOT NULL DEFAULT 60,
  tolerancia_min integer NOT NULL DEFAULT 10,
  dias_trabalho integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id)
);
ALTER TABLE public.ponto_configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant select ponto_config" ON public.ponto_configuracoes FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id() OR empresa_id = get_operational_empresa_id());
CREATE POLICY "Tenant insert ponto_config" ON public.ponto_configuracoes FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant update ponto_config" ON public.ponto_configuracoes FOR UPDATE TO authenticated
  USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant delete ponto_config" ON public.ponto_configuracoes FOR DELETE TO authenticated
  USING (empresa_id = get_user_empresa_id());

-- Punch records
CREATE TABLE public.ponto_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  operational_user_id uuid NOT NULL REFERENCES public.operational_users(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'entrada',
  data_hora timestamptz NOT NULL DEFAULT now(),
  latitude numeric,
  longitude numeric,
  selfie_url text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ponto_registros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin select ponto_reg" ON public.ponto_registros FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Op user select own ponto_reg" ON public.ponto_registros FOR SELECT TO authenticated
  USING (operational_user_id = get_operational_user_id());
CREATE POLICY "Op user insert own ponto_reg" ON public.ponto_registros FOR INSERT TO authenticated
  WITH CHECK (operational_user_id = get_operational_user_id());
CREATE POLICY "Admin update ponto_reg" ON public.ponto_registros FOR UPDATE TO authenticated
  USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Admin delete ponto_reg" ON public.ponto_registros FOR DELETE TO authenticated
  USING (empresa_id = get_user_empresa_id());

-- Daily summaries / bank hours
CREATE TABLE public.ponto_jornadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  operational_user_id uuid NOT NULL REFERENCES public.operational_users(id) ON DELETE CASCADE,
  data date NOT NULL,
  horas_trabalhadas_min integer DEFAULT 0,
  horas_esperadas_min integer DEFAULT 0,
  saldo_min integer DEFAULT 0,
  status text NOT NULL DEFAULT 'aberto',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, operational_user_id, data)
);
ALTER TABLE public.ponto_jornadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin select ponto_jorn" ON public.ponto_jornadas FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Op user select own ponto_jorn" ON public.ponto_jornadas FOR SELECT TO authenticated
  USING (operational_user_id = get_operational_user_id());
CREATE POLICY "Admin manage ponto_jorn" ON public.ponto_jornadas FOR ALL TO authenticated
  USING (empresa_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Op user insert own ponto_jorn" ON public.ponto_jornadas FOR INSERT TO authenticated
  WITH CHECK (operational_user_id = get_operational_user_id());
CREATE POLICY "Op user update own ponto_jorn" ON public.ponto_jornadas FOR UPDATE TO authenticated
  USING (operational_user_id = get_operational_user_id());

-- Storage bucket for selfies
INSERT INTO storage.buckets (id, name, public) VALUES ('ponto-selfies', 'ponto-selfies', true);
CREATE POLICY "Auth upload ponto selfie" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ponto-selfies');
CREATE POLICY "Public read ponto selfie" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'ponto-selfies');
CREATE POLICY "Auth delete ponto selfie" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ponto-selfies');

-- Enable realtime for punch records
ALTER PUBLICATION supabase_realtime ADD TABLE public.ponto_registros;
