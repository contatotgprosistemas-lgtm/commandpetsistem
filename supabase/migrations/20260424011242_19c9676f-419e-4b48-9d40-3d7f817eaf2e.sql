
-- Tabela de horário comercial (uma por empresa)
CREATE TABLE IF NOT EXISTS public.crm_horario_comercial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT false,
  fuso text NOT NULL DEFAULT 'America/Sao_Paulo',
  -- horarios: { "0": [{"inicio":"09:00","fim":"18:00"}], ..., "6": [] }  (0=domingo)
  horarios jsonb NOT NULL DEFAULT '{"0":[],"1":[{"inicio":"09:00","fim":"18:00"}],"2":[{"inicio":"09:00","fim":"18:00"}],"3":[{"inicio":"09:00","fim":"18:00"}],"4":[{"inicio":"09:00","fim":"18:00"}],"5":[{"inicio":"09:00","fim":"18:00"}],"6":[]}'::jsonb,
  feriados jsonb NOT NULL DEFAULT '[]'::jsonb,
  mensagem_fora_expediente text DEFAULT 'Olá! Recebemos sua mensagem fora do nosso horário de atendimento. Retornaremos em breve. 🕐',
  enviar_apenas_uma_vez boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_horario_comercial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "horario_select" ON public.crm_horario_comercial FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id());
CREATE POLICY "horario_insert" ON public.crm_horario_comercial FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "horario_update" ON public.crm_horario_comercial FOR UPDATE TO authenticated
  USING (empresa_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "horario_delete" ON public.crm_horario_comercial FOR DELETE TO authenticated
  USING (empresa_id = get_user_empresa_id() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gerente'::app_role)));

CREATE TRIGGER trg_horario_updated BEFORE UPDATE ON public.crm_horario_comercial
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Roteamento por canal
ALTER TABLE public.crm_canais
  ADD COLUMN IF NOT EXISTS roteamento text NOT NULL DEFAULT 'nenhum',
  ADD COLUMN IF NOT EXISTS roteamento_atendentes uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS roteamento_ultimo_idx integer NOT NULL DEFAULT 0;

-- Marcar conversa quando aviso de ausência foi enviado
ALTER TABLE public.crm_conversas
  ADD COLUMN IF NOT EXISTS aviso_ausencia_em timestamptz;
