
-- Ajustar crm_tarefas existente
ALTER TABLE public.crm_tarefas ADD COLUMN IF NOT EXISTS prioridade text NOT NULL DEFAULT 'media';
ALTER TABLE public.crm_tarefas ADD COLUMN IF NOT EXISTS created_by uuid;

-- ===== CRM FLOWS =====
CREATE TABLE IF NOT EXISTS public.crm_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  gatilho text NOT NULL DEFAULT 'mensagem_recebida',
  gatilho_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT false,
  definicao jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_flows_empresa ON public.crm_flows(empresa_id);
ALTER TABLE public.crm_flows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flows_select" ON public.crm_flows;
DROP POLICY IF EXISTS "flows_insert" ON public.crm_flows;
DROP POLICY IF EXISTS "flows_update" ON public.crm_flows;
DROP POLICY IF EXISTS "flows_delete" ON public.crm_flows;

CREATE POLICY "flows_select" ON public.crm_flows FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "flows_insert" ON public.crm_flows FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "flows_update" ON public.crm_flows FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "flows_delete" ON public.crm_flows FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

DROP TRIGGER IF EXISTS trg_crm_flows_updated ON public.crm_flows;
CREATE TRIGGER trg_crm_flows_updated BEFORE UPDATE ON public.crm_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== CRM FLOW EXECUTIONS =====
CREATE TABLE IF NOT EXISTS public.crm_flow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  flow_id uuid NOT NULL REFERENCES public.crm_flows(id) ON DELETE CASCADE,
  contato_id uuid,
  conversa_id uuid,
  status text NOT NULL DEFAULT 'iniciado',
  payload jsonb DEFAULT '{}'::jsonb,
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_flow_exec_flow ON public.crm_flow_executions(flow_id);
CREATE INDEX IF NOT EXISTS idx_crm_flow_exec_empresa ON public.crm_flow_executions(empresa_id);

ALTER TABLE public.crm_flow_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flow_exec_select" ON public.crm_flow_executions;
DROP POLICY IF EXISTS "flow_exec_insert" ON public.crm_flow_executions;

CREATE POLICY "flow_exec_select" ON public.crm_flow_executions FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "flow_exec_insert" ON public.crm_flow_executions FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());
