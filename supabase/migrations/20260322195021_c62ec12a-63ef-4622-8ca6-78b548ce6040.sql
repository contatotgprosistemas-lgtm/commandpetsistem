
-- Tabela de regras do chatbot
CREATE TABLE public.chatbot_regras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'palavra_chave', -- 'boas_vindas', 'menu', 'palavra_chave', 'ausencia'
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  gatilho TEXT, -- palavra-chave ou null para boas-vindas
  resposta TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  horario_inicio TIME, -- horário comercial (para ausência)
  horario_fim TIME,
  dias_semana INTEGER[] DEFAULT '{1,2,3,4,5}', -- 1=seg ... 7=dom
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chatbot_regras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.chatbot_regras
  FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.chatbot_regras
  FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.chatbot_regras
  FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.chatbot_regras
  FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());
