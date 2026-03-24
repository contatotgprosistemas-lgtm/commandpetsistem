
-- Categories table
CREATE TABLE public.plano_contas_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'despesa', -- receita, despesa
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plano_contas_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.plano_contas_categorias FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.plano_contas_categorias FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.plano_contas_categorias FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.plano_contas_categorias FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- Accounts table
CREATE TABLE public.plano_contas_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  categoria_id uuid NOT NULL REFERENCES public.plano_contas_categorias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plano_contas_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.plano_contas_items FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.plano_contas_items FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.plano_contas_items FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.plano_contas_items FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());
