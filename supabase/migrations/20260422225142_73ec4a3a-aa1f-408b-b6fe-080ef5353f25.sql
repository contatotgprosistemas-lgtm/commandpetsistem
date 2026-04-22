CREATE TABLE IF NOT EXISTS public.chatbot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  conversa_id uuid NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
  flow_id uuid NOT NULL REFERENCES public.chatbot_flows(id) ON DELETE CASCADE,
  current_step_id uuid REFERENCES public.chatbot_flow_steps(id) ON DELETE SET NULL,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_interaction_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversa_id)
);

CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_conversa ON public.chatbot_sessions(conversa_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_empresa ON public.chatbot_sessions(empresa_id);

ALTER TABLE public.chatbot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company chatbot sessions"
  ON public.chatbot_sessions FOR SELECT
  TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Users can manage their company chatbot sessions"
  ON public.chatbot_sessions FOR ALL
  TO authenticated
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());