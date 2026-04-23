
-- 1. crm_contatos table (leads, separate from operational clients)
CREATE TABLE public.crm_contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text,
  email text,
  empresa text,
  origem text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_contatos_empresa ON public.crm_contatos(empresa_id);
CREATE INDEX idx_crm_contatos_telefone ON public.crm_contatos(empresa_id, telefone);

ALTER TABLE public.crm_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select crm_contatos" ON public.crm_contatos
  FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant insert crm_contatos" ON public.crm_contatos
  FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant update crm_contatos" ON public.crm_contatos
  FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant delete crm_contatos" ON public.crm_contatos
  FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

CREATE TRIGGER update_crm_contatos_updated_at
  BEFORE UPDATE ON public.crm_contatos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add crm_contato_id and relax cliente_id on related tables
ALTER TABLE public.funil_vendas
  ADD COLUMN crm_contato_id uuid REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
  ALTER COLUMN cliente_id DROP NOT NULL,
  ADD CONSTRAINT funil_vendas_owner_check CHECK (cliente_id IS NOT NULL OR crm_contato_id IS NOT NULL);

ALTER TABLE public.historico_interacoes
  ADD COLUMN crm_contato_id uuid REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
  ALTER COLUMN cliente_id DROP NOT NULL,
  ADD CONSTRAINT historico_interacoes_owner_check CHECK (cliente_id IS NOT NULL OR crm_contato_id IS NOT NULL);

ALTER TABLE public.contact_tasks
  ADD COLUMN crm_contato_id uuid REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
  ALTER COLUMN cliente_id DROP NOT NULL,
  ADD CONSTRAINT contact_tasks_owner_check CHECK (cliente_id IS NOT NULL OR crm_contato_id IS NOT NULL);

ALTER TABLE public.notas_contato
  ADD COLUMN crm_contato_id uuid REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
  ALTER COLUMN cliente_id DROP NOT NULL,
  ADD CONSTRAINT notas_contato_owner_check CHECK (cliente_id IS NOT NULL OR crm_contato_id IS NOT NULL);

-- 3. Add crm_contato_id to conversas so we can link a conversation to a CRM lead
ALTER TABLE public.conversas
  ADD COLUMN crm_contato_id uuid REFERENCES public.crm_contatos(id) ON DELETE SET NULL;

CREATE INDEX idx_conversas_crm_contato ON public.conversas(crm_contato_id);
