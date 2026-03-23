
-- Table for manejo (boletim diário) records
CREATE TABLE public.manejo_registros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id),
  respostas JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.manejo_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.manejo_registros FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.manejo_registros FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.manejo_registros FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.manejo_registros FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- Table for checklist records
CREATE TABLE public.checklist_registros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id),
  respostas JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.checklist_registros FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.checklist_registros FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.checklist_registros FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.checklist_registros FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- Table for service history on clients
CREATE TABLE public.historico_servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES public.pets(id),
  tipo_servico TEXT NOT NULL,
  valor NUMERIC,
  data_servico TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  agendamento_id UUID REFERENCES public.agendamentos(id),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.historico_servicos FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.historico_servicos FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.historico_servicos FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.historico_servicos FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());
