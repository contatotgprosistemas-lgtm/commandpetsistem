-- =============================================
-- MÓDULO COMERCIAL (Khronnos CRM portado)
-- Tabelas em paralelo ao CRM atual, isolamento por empresa_id
-- =============================================

-- CONTATOS
CREATE TABLE public.comercial_contatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_by UUID,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  empresa_contato TEXT,
  avatar_url TEXT,
  tags TEXT[] DEFAULT '{}',
  origem TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comercial_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comercial_contatos select empresa"
ON public.comercial_contatos FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "comercial_contatos insert empresa"
ON public.comercial_contatos FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "comercial_contatos update empresa"
ON public.comercial_contatos FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "comercial_contatos delete empresa"
ON public.comercial_contatos FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER update_comercial_contatos_updated_at
BEFORE UPDATE ON public.comercial_contatos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_comercial_contatos_empresa ON public.comercial_contatos(empresa_id);
CREATE INDEX idx_comercial_contatos_telefone ON public.comercial_contatos(telefone);

-- ETAPAS DO PIPELINE
CREATE TABLE public.comercial_pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT 'hsl(var(--primary))',
  posicao INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comercial_pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comercial_stages select empresa"
ON public.comercial_pipeline_stages FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "comercial_stages insert empresa"
ON public.comercial_pipeline_stages FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "comercial_stages update empresa"
ON public.comercial_pipeline_stages FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "comercial_stages delete empresa"
ON public.comercial_pipeline_stages FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER update_comercial_stages_updated_at
BEFORE UPDATE ON public.comercial_pipeline_stages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_comercial_stages_empresa ON public.comercial_pipeline_stages(empresa_id, posicao);

-- DEALS / OPORTUNIDADES
CREATE TABLE public.comercial_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  contato_id UUID REFERENCES public.comercial_contatos(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES public.comercial_pipeline_stages(id) ON DELETE SET NULL,
  responsavel_id UUID,
  titulo TEXT NOT NULL,
  valor NUMERIC(12,2) DEFAULT 0,
  probabilidade INTEGER DEFAULT 0 CHECK (probabilidade >= 0 AND probabilidade <= 100),
  canal TEXT,
  tags TEXT[] DEFAULT '{}',
  responsavel_nome TEXT,
  responsavel_iniciais TEXT,
  dias_no_estagio INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comercial_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comercial_deals select empresa"
ON public.comercial_deals FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "comercial_deals insert empresa"
ON public.comercial_deals FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "comercial_deals update empresa"
ON public.comercial_deals FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "comercial_deals delete empresa"
ON public.comercial_deals FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER update_comercial_deals_updated_at
BEFORE UPDATE ON public.comercial_deals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_comercial_deals_empresa ON public.comercial_deals(empresa_id);
CREATE INDEX idx_comercial_deals_stage ON public.comercial_deals(stage_id);

-- CONVERSAS
CREATE TABLE public.comercial_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  contato_id UUID REFERENCES public.comercial_contatos(id) ON DELETE CASCADE,
  canal TEXT NOT NULL DEFAULT 'whatsapp',
  numero_label TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  fixada BOOLEAN DEFAULT false,
  unread_count INTEGER DEFAULT 0,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  pipeline_stage TEXT,
  deal_value TEXT,
  origem TEXT,
  tag_label TEXT,
  tag_tone TEXT,
  online BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comercial_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comercial_conversations select empresa"
ON public.comercial_conversations FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "comercial_conversations insert empresa"
ON public.comercial_conversations FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "comercial_conversations update empresa"
ON public.comercial_conversations FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "comercial_conversations delete empresa"
ON public.comercial_conversations FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER update_comercial_conversations_updated_at
BEFORE UPDATE ON public.comercial_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_comercial_conv_empresa ON public.comercial_conversations(empresa_id);
CREATE INDEX idx_comercial_conv_last_msg ON public.comercial_conversations(last_message_at DESC);

-- MENSAGENS
CREATE TABLE public.comercial_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.comercial_conversations(id) ON DELETE CASCADE,
  sent_by UUID,
  direction TEXT NOT NULL CHECK (direction IN ('me', 'them')),
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comercial_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comercial_messages select empresa"
ON public.comercial_messages FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "comercial_messages insert empresa"
ON public.comercial_messages FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "comercial_messages update empresa"
ON public.comercial_messages FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "comercial_messages delete empresa"
ON public.comercial_messages FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE INDEX idx_comercial_msg_conv ON public.comercial_messages(conversation_id, created_at);
CREATE INDEX idx_comercial_msg_empresa ON public.comercial_messages(empresa_id);

-- REALTIME
ALTER TABLE public.comercial_messages REPLICA IDENTITY FULL;
ALTER TABLE public.comercial_conversations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comercial_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comercial_conversations;

-- SEED automático de etapas padrão para empresas novas (e existentes via migration manual abaixo)
CREATE OR REPLACE FUNCTION public.seed_comercial_stages_for_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.comercial_pipeline_stages (empresa_id, nome, cor, posicao, is_default)
  VALUES
    (NEW.id, 'Novo Lead',   'hsl(var(--chart-1))', 0, true),
    (NEW.id, 'Em contato',  'hsl(var(--chart-2))', 1, true),
    (NEW.id, 'Qualificado', 'hsl(var(--info))',    2, true),
    (NEW.id, 'Proposta',    'hsl(var(--warning))', 3, true),
    (NEW.id, 'Negociação',  'hsl(var(--chart-5))', 4, true),
    (NEW.id, 'Ganho',       'hsl(var(--success))', 5, true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_comercial_stages_after_empresa
AFTER INSERT ON public.empresas
FOR EACH ROW EXECUTE FUNCTION public.seed_comercial_stages_for_empresa();

-- Seed para empresas existentes (idempotente)
INSERT INTO public.comercial_pipeline_stages (empresa_id, nome, cor, posicao, is_default)
SELECT e.id, x.nome, x.cor, x.pos, true
FROM public.empresas e
CROSS JOIN (VALUES
  ('Novo Lead',   'hsl(var(--chart-1))', 0),
  ('Em contato',  'hsl(var(--chart-2))', 1),
  ('Qualificado', 'hsl(var(--info))',    2),
  ('Proposta',    'hsl(var(--warning))', 3),
  ('Negociação',  'hsl(var(--chart-5))', 4),
  ('Ganho',       'hsl(var(--success))', 5)
) AS x(nome, cor, pos)
WHERE NOT EXISTS (
  SELECT 1 FROM public.comercial_pipeline_stages s WHERE s.empresa_id = e.id
);