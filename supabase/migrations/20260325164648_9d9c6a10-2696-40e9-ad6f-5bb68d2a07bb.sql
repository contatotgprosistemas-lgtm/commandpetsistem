
CREATE TABLE public.estou_chegando (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  latitude numeric,
  longitude numeric,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estou_chegando ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.estou_chegando FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.estou_chegando FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.estou_chegando FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.estou_chegando FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Client manages own tracking" ON public.estou_chegando FOR ALL TO authenticated USING (cliente_id = get_user_cliente_id()) WITH CHECK (cliente_id = get_user_cliente_id());

ALTER PUBLICATION supabase_realtime ADD TABLE public.estou_chegando;
