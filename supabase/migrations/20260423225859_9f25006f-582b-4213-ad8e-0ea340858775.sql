-- Limpa estado parcial
DROP TABLE IF EXISTS public.crm_contatos CASCADE;

-- ENUMS
CREATE TYPE public.crm_canal_tipo AS ENUM ('whatsapp', 'instagram', 'facebook', 'email', 'webchat', 'sms');
CREATE TYPE public.crm_canal_provedor AS ENUM ('evolution', 'cloud_api', 'baileys', 'wppconnect', 'meta', 'manual');
CREATE TYPE public.crm_canal_status AS ENUM ('desconectado', 'conectando', 'conectado', 'erro');
CREATE TYPE public.crm_lead_status AS ENUM ('aberto', 'ganho', 'perdido');
CREATE TYPE public.crm_conversa_status AS ENUM ('aberta', 'pendente', 'em_atendimento', 'finalizada');
CREATE TYPE public.crm_conversa_prioridade AS ENUM ('baixa', 'normal', 'alta', 'urgente');
CREATE TYPE public.crm_mensagem_tipo AS ENUM ('texto', 'imagem', 'audio', 'video', 'documento', 'localizacao', 'contato', 'sistema');
CREATE TYPE public.crm_mensagem_direcao AS ENUM ('entrada', 'saida');
CREATE TYPE public.crm_mensagem_status AS ENUM ('pendente', 'enviado', 'entregue', 'lido', 'falhou');
CREATE TYPE public.crm_tarefa_status AS ENUM ('pendente', 'em_andamento', 'concluida', 'cancelada');

-- CANAIS
CREATE TABLE public.crm_canais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo public.crm_canal_tipo NOT NULL DEFAULT 'whatsapp',
  provedor public.crm_canal_provedor NOT NULL DEFAULT 'evolution',
  setor TEXT,
  identificador TEXT,
  numero_telefone TEXT,
  status public.crm_canal_status NOT NULL DEFAULT 'desconectado',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  cor TEXT DEFAULT '#10B981',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultima_conexao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_canais_empresa ON public.crm_canais(empresa_id);

-- PIPELINES
CREATE TABLE public.crm_pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#3B82F6',
  is_padrao BOOLEAN NOT NULL DEFAULT false,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_pipelines_empresa ON public.crm_pipelines(empresa_id);

CREATE TABLE public.crm_pipeline_etapas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#94A3B8',
  ordem INT NOT NULL DEFAULT 0,
  probabilidade INT NOT NULL DEFAULT 0,
  is_ganho BOOLEAN NOT NULL DEFAULT false,
  is_perdido BOOLEAN NOT NULL DEFAULT false,
  sla_horas INT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_etapas_pipeline ON public.crm_pipeline_etapas(pipeline_id);

-- TAGS
CREATE TABLE public.crm_contato_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, nome)
);
CREATE INDEX idx_crm_tags_empresa ON public.crm_contato_tags(empresa_id);

-- CONTATOS
CREATE TABLE public.crm_contatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  empresa TEXT,
  documento TEXT,
  cidade TEXT,
  estado TEXT,
  endereco TEXT,
  origem TEXT,
  responsavel_id UUID,
  score INT NOT NULL DEFAULT 0,
  valor_potencial NUMERIC(12,2) DEFAULT 0,
  observacoes TEXT,
  avatar_url TEXT,
  ultima_interacao TIMESTAMP WITH TIME ZONE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_contatos_empresa ON public.crm_contatos(empresa_id);
CREATE INDEX idx_crm_contatos_whatsapp ON public.crm_contatos(empresa_id, whatsapp);
CREATE INDEX idx_crm_contatos_telefone ON public.crm_contatos(empresa_id, telefone);

CREATE TABLE public.crm_contato_tag_links (
  contato_id UUID NOT NULL REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.crm_contato_tags(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL,
  PRIMARY KEY (contato_id, tag_id)
);

-- LEADS
CREATE TABLE public.crm_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  contato_id UUID NOT NULL REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id),
  etapa_id UUID NOT NULL REFERENCES public.crm_pipeline_etapas(id),
  titulo TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC(12,2) DEFAULT 0,
  probabilidade INT DEFAULT 0,
  status public.crm_lead_status NOT NULL DEFAULT 'aberto',
  motivo_perda TEXT,
  responsavel_id UUID,
  origem TEXT,
  data_previsao_fechamento DATE,
  data_fechamento TIMESTAMP WITH TIME ZONE,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_leads_empresa ON public.crm_leads(empresa_id);
CREATE INDEX idx_crm_leads_pipeline_etapa ON public.crm_leads(pipeline_id, etapa_id, status);
CREATE INDEX idx_crm_leads_contato ON public.crm_leads(contato_id);

-- CONVERSAS
CREATE TABLE public.crm_conversas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  contato_id UUID NOT NULL REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
  canal_id UUID NOT NULL REFERENCES public.crm_canais(id) ON DELETE CASCADE,
  atendente_id UUID,
  status public.crm_conversa_status NOT NULL DEFAULT 'aberta',
  prioridade public.crm_conversa_prioridade NOT NULL DEFAULT 'normal',
  identificador_externo TEXT,
  ultima_mensagem TEXT,
  ultima_mensagem_em TIMESTAMP WITH TIME ZONE,
  nao_lidas INT NOT NULL DEFAULT 0,
  fixada BOOLEAN NOT NULL DEFAULT false,
  arquivada BOOLEAN NOT NULL DEFAULT false,
  resumo_ia TEXT,
  sentimento TEXT,
  intencao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_conversas_empresa ON public.crm_conversas(empresa_id);
CREATE INDEX idx_crm_conversas_canal ON public.crm_conversas(canal_id);
CREATE INDEX idx_crm_conversas_contato ON public.crm_conversas(contato_id);
CREATE INDEX idx_crm_conversas_atendente ON public.crm_conversas(atendente_id);
CREATE INDEX idx_crm_conversas_status ON public.crm_conversas(empresa_id, status);

-- MENSAGENS
CREATE TABLE public.crm_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  conversa_id UUID NOT NULL REFERENCES public.crm_conversas(id) ON DELETE CASCADE,
  tipo public.crm_mensagem_tipo NOT NULL DEFAULT 'texto',
  direcao public.crm_mensagem_direcao NOT NULL,
  conteudo TEXT,
  midia_url TEXT,
  midia_mimetype TEXT,
  midia_filename TEXT,
  midia_tamanho INT,
  status public.crm_mensagem_status NOT NULL DEFAULT 'pendente',
  remetente_id UUID,
  remetente_nome TEXT,
  identificador_externo TEXT,
  reply_to_id UUID,
  reacao TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  enviada_em TIMESTAMP WITH TIME ZONE,
  entregue_em TIMESTAMP WITH TIME ZONE,
  lida_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_mensagens_conversa ON public.crm_mensagens(conversa_id, created_at);
CREATE INDEX idx_crm_mensagens_empresa ON public.crm_mensagens(empresa_id);

-- ANOTACOES, RESPOSTAS, TAREFAS, ATIVIDADES
CREATE TABLE public.crm_anotacoes_internas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  conversa_id UUID REFERENCES public.crm_conversas(id) ON DELETE CASCADE,
  contato_id UUID REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL,
  conteudo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_anotacoes_conversa ON public.crm_anotacoes_internas(conversa_id);

CREATE TABLE public.crm_respostas_rapidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  atalho TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  categoria TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_respostas_empresa ON public.crm_respostas_rapidas(empresa_id);

CREATE TABLE public.crm_tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  contato_id UUID REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  conversa_id UUID REFERENCES public.crm_conversas(id) ON DELETE SET NULL,
  responsavel_id UUID,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT,
  status public.crm_tarefa_status NOT NULL DEFAULT 'pendente',
  prazo TIMESTAMP WITH TIME ZONE,
  concluida_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_tarefas_empresa ON public.crm_tarefas(empresa_id);
CREATE INDEX idx_crm_tarefas_responsavel ON public.crm_tarefas(responsavel_id, status);

CREATE TABLE public.crm_atividades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  contato_id UUID REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  autor_id UUID,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_atividades_contato ON public.crm_atividades(contato_id, created_at DESC);
CREATE INDEX idx_crm_atividades_lead ON public.crm_atividades(lead_id, created_at DESC);

CREATE TABLE public.crm_atendentes_canal (
  canal_id UUID NOT NULL REFERENCES public.crm_canais(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  PRIMARY KEY (canal_id, user_id)
);

-- RLS
ALTER TABLE public.crm_canais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contato_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contato_tag_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_anotacoes_internas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_respostas_rapidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_atendentes_canal ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'crm_canais','crm_pipelines','crm_pipeline_etapas','crm_contatos',
    'crm_contato_tags','crm_contato_tag_links','crm_leads','crm_conversas',
    'crm_mensagens','crm_anotacoes_internas','crm_respostas_rapidas',
    'crm_tarefas','crm_atividades','crm_atendentes_canal'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('CREATE POLICY "empresa_select_%s" ON public.%I FOR SELECT USING (empresa_id = public.get_user_empresa_id())', t, t);
    EXECUTE format('CREATE POLICY "empresa_insert_%s" ON public.%I FOR INSERT WITH CHECK (empresa_id = public.get_user_empresa_id())', t, t);
    EXECUTE format('CREATE POLICY "empresa_update_%s" ON public.%I FOR UPDATE USING (empresa_id = public.get_user_empresa_id())', t, t);
    EXECUTE format('CREATE POLICY "empresa_delete_%s" ON public.%I FOR DELETE USING (empresa_id = public.get_user_empresa_id())', t, t);
  END LOOP;
END $$;

-- TRIGGERS updated_at
CREATE TRIGGER trg_crm_canais_updated BEFORE UPDATE ON public.crm_canais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_pipelines_updated BEFORE UPDATE ON public.crm_pipelines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_etapas_updated BEFORE UPDATE ON public.crm_pipeline_etapas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_contatos_updated BEFORE UPDATE ON public.crm_contatos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_leads_updated BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_conversas_updated BEFORE UPDATE ON public.crm_conversas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_respostas_updated BEFORE UPDATE ON public.crm_respostas_rapidas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_tarefas_updated BEFORE UPDATE ON public.crm_tarefas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_conversas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_leads;