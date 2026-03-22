
-- Chatbot flows table
CREATE TABLE public.chatbot_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT false,
  trigger_keyword TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chatbot_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company flows"
ON public.chatbot_flows
FOR ALL
TO authenticated
USING (empresa_id = public.get_user_empresa_id())
WITH CHECK (empresa_id = public.get_user_empresa_id());

-- Chatbot flow steps table
CREATE TABLE public.chatbot_flow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID REFERENCES public.chatbot_flows(id) ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  step_type TEXT NOT NULL DEFAULT 'message',
  message TEXT DEFAULT '',
  options JSONB DEFAULT '[]'::jsonb,
  delay_seconds INTEGER DEFAULT 0,
  condition_config JSONB,
  next_step_id UUID,
  position_x DOUBLE PRECISION DEFAULT 0,
  position_y DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chatbot_flow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company flow steps"
ON public.chatbot_flow_steps
FOR ALL
TO authenticated
USING (empresa_id = public.get_user_empresa_id())
WITH CHECK (empresa_id = public.get_user_empresa_id());
