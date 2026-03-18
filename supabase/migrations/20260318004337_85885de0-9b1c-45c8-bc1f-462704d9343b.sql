
-- Funil de vendas
CREATE TABLE public.funil_vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  estagio text NOT NULL DEFAULT 'novo_lead',
  valor_estimado numeric DEFAULT 0,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funil_vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation select" ON public.funil_vendas FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.funil_vendas FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.funil_vendas FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.funil_vendas FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE TRIGGER update_funil_vendas_updated_at BEFORE UPDATE ON public.funil_vendas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notas internas de contato
CREATE TABLE public.notas_contato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES public.profiles(id),
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notas_contato ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation select" ON public.notas_contato FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.notas_contato FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.notas_contato FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.notas_contato FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE TRIGGER update_notas_contato_updated_at BEFORE UPDATE ON public.notas_contato FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Histórico de interações
CREATE TABLE public.historico_interacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'atividade',
  descricao text NOT NULL,
  user_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_interacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation select" ON public.historico_interacoes FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.historico_interacoes FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.historico_interacoes FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.historico_interacoes FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());
