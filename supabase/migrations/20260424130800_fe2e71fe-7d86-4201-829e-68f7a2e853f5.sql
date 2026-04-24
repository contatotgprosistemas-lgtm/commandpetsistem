
-- 1) Setores customizáveis por empresa
CREATE TABLE public.crm_setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  nome text NOT NULL,
  cor text DEFAULT '#3B82F6',
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nome)
);
CREATE INDEX idx_crm_setores_empresa ON public.crm_setores(empresa_id);

ALTER TABLE public.crm_setores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresa_select_crm_setores" ON public.crm_setores FOR SELECT USING (empresa_id = get_user_empresa_id());
CREATE POLICY "empresa_insert_crm_setores" ON public.crm_setores FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "empresa_update_crm_setores" ON public.crm_setores FOR UPDATE USING (empresa_id = get_user_empresa_id());
CREATE POLICY "empresa_delete_crm_setores" ON public.crm_setores FOR DELETE USING (empresa_id = get_user_empresa_id());

CREATE TRIGGER trg_crm_setores_updated BEFORE UPDATE ON public.crm_setores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2) Atendentes por setor
CREATE TABLE public.crm_setor_atendentes (
  setor_id uuid NOT NULL REFERENCES public.crm_setores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  PRIMARY KEY (setor_id, user_id)
);
CREATE INDEX idx_crm_setor_atendentes_user ON public.crm_setor_atendentes(user_id);
CREATE INDEX idx_crm_setor_atendentes_empresa ON public.crm_setor_atendentes(empresa_id);

ALTER TABLE public.crm_setor_atendentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresa_select_crm_setor_atendentes" ON public.crm_setor_atendentes FOR SELECT USING (empresa_id = get_user_empresa_id());
CREATE POLICY "empresa_insert_crm_setor_atendentes" ON public.crm_setor_atendentes FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "empresa_delete_crm_setor_atendentes" ON public.crm_setor_atendentes FOR DELETE USING (empresa_id = get_user_empresa_id());

-- 3) Helper: setores do usuário (security definer p/ evitar recursão em RLS)
CREATE OR REPLACE FUNCTION public.get_user_setor_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT setor_id FROM public.crm_setor_atendentes WHERE user_id = auth.uid()
$$;

-- 4) Extensões em crm_canais
ALTER TABLE public.crm_canais
  ADD COLUMN IF NOT EXISTS setor_padrao_id uuid REFERENCES public.crm_setores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS roteamento_modo text NOT NULL DEFAULT 'nenhum',
  ADD COLUMN IF NOT EXISTS menu_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS palavras_chave_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 5) Extensões em crm_conversas
ALTER TABLE public.crm_conversas
  ADD COLUMN IF NOT EXISTS setor_id uuid REFERENCES public.crm_setores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aguardando_setor boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_crm_conversas_setor ON public.crm_conversas(setor_id);

-- 6) Atualiza RLS de conversas: minhas + não atribuídas do meu setor
DROP POLICY IF EXISTS "crm_conversas_select_scoped" ON public.crm_conversas;
DROP POLICY IF EXISTS "crm_conversas_update_scoped" ON public.crm_conversas;
DROP POLICY IF EXISTS "empresa_select_crm_conversas" ON public.crm_conversas;
DROP POLICY IF EXISTS "empresa_update_crm_conversas" ON public.crm_conversas;

CREATE POLICY "crm_conversas_select_scoped" ON public.crm_conversas
FOR SELECT TO authenticated
USING (
  empresa_id = get_user_empresa_id()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR atendente_id = auth.uid()
    OR (atendente_id IS NULL AND (setor_id IS NULL OR setor_id IN (SELECT public.get_user_setor_ids())))
  )
);

CREATE POLICY "crm_conversas_update_scoped" ON public.crm_conversas
FOR UPDATE TO authenticated
USING (
  empresa_id = get_user_empresa_id()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR atendente_id = auth.uid()
    OR (atendente_id IS NULL AND (setor_id IS NULL OR setor_id IN (SELECT public.get_user_setor_ids())))
  )
)
WITH CHECK (empresa_id = get_user_empresa_id());
