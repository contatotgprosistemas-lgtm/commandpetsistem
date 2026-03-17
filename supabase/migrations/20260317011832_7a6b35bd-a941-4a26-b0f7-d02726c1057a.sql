
-- Tabela de conexões WhatsApp por empresa
CREATE TABLE public.conexoes_whatsapp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  numero TEXT,
  status TEXT NOT NULL DEFAULT 'desconectado',
  session_data JSONB,
  data_conexao TIMESTAMPTZ,
  ultima_atividade TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.conexoes_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.conexoes_whatsapp
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Tenant isolation insert" ON public.conexoes_whatsapp
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "Tenant isolation update" ON public.conexoes_whatsapp
  FOR UPDATE TO authenticated
  USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Tenant isolation delete" ON public.conexoes_whatsapp
  FOR DELETE TO authenticated
  USING (empresa_id = get_user_empresa_id());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conexoes_whatsapp;
