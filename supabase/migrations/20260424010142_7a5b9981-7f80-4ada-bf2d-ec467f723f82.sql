
-- Templates de mensagem
CREATE TABLE public.crm_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  nome text NOT NULL,
  atalho text,
  categoria text,
  conteudo text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_templates_empresa ON public.crm_templates(empresa_id);
ALTER TABLE public.crm_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_select_crm_templates" ON public.crm_templates FOR SELECT
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "empresa_insert_crm_templates" ON public.crm_templates FOR INSERT
  WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "empresa_update_crm_templates" ON public.crm_templates FOR UPDATE
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "empresa_delete_crm_templates" ON public.crm_templates FOR DELETE
  USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER trg_crm_templates_updated BEFORE UPDATE ON public.crm_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mensagens agendadas
CREATE TABLE public.crm_mensagens_agendadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  conversa_id uuid NOT NULL REFERENCES public.crm_conversas(id) ON DELETE CASCADE,
  conteudo text NOT NULL,
  agendada_para timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  enviada_em timestamptz,
  erro text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_mensagens_agendadas_empresa ON public.crm_mensagens_agendadas(empresa_id);
CREATE INDEX idx_crm_mensagens_agendadas_pendentes ON public.crm_mensagens_agendadas(status, agendada_para)
  WHERE status = 'pendente';
ALTER TABLE public.crm_mensagens_agendadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_select_crm_msg_agendadas" ON public.crm_mensagens_agendadas FOR SELECT
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "empresa_insert_crm_msg_agendadas" ON public.crm_mensagens_agendadas FOR INSERT
  WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "empresa_update_crm_msg_agendadas" ON public.crm_mensagens_agendadas FOR UPDATE
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "empresa_delete_crm_msg_agendadas" ON public.crm_mensagens_agendadas FOR DELETE
  USING (empresa_id = public.get_user_empresa_id());

-- Notas internas em conversas
CREATE TABLE public.crm_notas_conversa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  conversa_id uuid NOT NULL REFERENCES public.crm_conversas(id) ON DELETE CASCADE,
  autor_id uuid,
  autor_nome text,
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_notas_conversa ON public.crm_notas_conversa(conversa_id, created_at DESC);
ALTER TABLE public.crm_notas_conversa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_select_crm_notas_conversa" ON public.crm_notas_conversa FOR SELECT
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "empresa_insert_crm_notas_conversa" ON public.crm_notas_conversa FOR INSERT
  WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "empresa_delete_crm_notas_conversa" ON public.crm_notas_conversa FOR DELETE
  USING (empresa_id = public.get_user_empresa_id());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_notas_conversa;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_mensagens_agendadas;
