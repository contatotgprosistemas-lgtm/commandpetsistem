-- Campanhas
CREATE TABLE public.crm_campanhas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  canal_id UUID,
  mensagem TEXT NOT NULL,
  midia_url TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  agendado_para TIMESTAMP WITH TIME ZONE,
  iniciado_em TIMESTAMP WITH TIME ZONE,
  finalizado_em TIMESTAMP WITH TIME ZONE,
  total_destinatarios INTEGER NOT NULL DEFAULT 0,
  total_enviados INTEGER NOT NULL DEFAULT 0,
  total_falhas INTEGER NOT NULL DEFAULT 0,
  intervalo_segundos INTEGER NOT NULL DEFAULT 5,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_campanhas_empresa ON public.crm_campanhas(empresa_id);
CREATE INDEX idx_crm_campanhas_status ON public.crm_campanhas(status);

ALTER TABLE public.crm_campanhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa pode ver suas campanhas" ON public.crm_campanhas
  FOR SELECT USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Empresa pode criar campanhas" ON public.crm_campanhas
  FOR INSERT WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Empresa pode atualizar campanhas" ON public.crm_campanhas
  FOR UPDATE USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Empresa pode excluir campanhas" ON public.crm_campanhas
  FOR DELETE USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER update_crm_campanhas_updated_at
  BEFORE UPDATE ON public.crm_campanhas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Destinatários
CREATE TABLE public.crm_campanha_destinatarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id UUID NOT NULL REFERENCES public.crm_campanhas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL,
  contato_id UUID,
  numero TEXT NOT NULL,
  nome TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  enviado_em TIMESTAMP WITH TIME ZONE,
  erro TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_campanha_dest_campanha ON public.crm_campanha_destinatarios(campanha_id);
CREATE INDEX idx_crm_campanha_dest_empresa ON public.crm_campanha_destinatarios(empresa_id);
CREATE INDEX idx_crm_campanha_dest_status ON public.crm_campanha_destinatarios(status);

ALTER TABLE public.crm_campanha_destinatarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa pode ver destinatarios" ON public.crm_campanha_destinatarios
  FOR SELECT USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Empresa pode criar destinatarios" ON public.crm_campanha_destinatarios
  FOR INSERT WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Empresa pode atualizar destinatarios" ON public.crm_campanha_destinatarios
  FOR UPDATE USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Empresa pode excluir destinatarios" ON public.crm_campanha_destinatarios
  FOR DELETE USING (empresa_id = public.get_user_empresa_id());