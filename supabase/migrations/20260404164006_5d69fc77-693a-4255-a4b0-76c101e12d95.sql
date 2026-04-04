
-- Tabela de configurações fiscais por empresa
CREATE TABLE public.fiscal_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT,
  inscricao_estadual TEXT,
  regime_tributario TEXT DEFAULT 'simples_nacional',
  endereco_logradouro TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cep TEXT,
  endereco_municipio TEXT,
  endereco_codigo_municipio TEXT,
  endereco_uf TEXT,
  token_focus TEXT,
  ambiente TEXT DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),
  serie_padrao TEXT DEFAULT '1',
  natureza_operacao_padrao TEXT DEFAULT 'Venda de mercadorias',
  cfop_padrao TEXT DEFAULT '5102',
  webhook_url TEXT,
  webhook_ativo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id)
);

ALTER TABLE public.fiscal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_settings_select" ON public.fiscal_settings FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "fiscal_settings_insert" ON public.fiscal_settings FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "fiscal_settings_update" ON public.fiscal_settings FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "fiscal_settings_delete" ON public.fiscal_settings FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER update_fiscal_settings_updated_at
  BEFORE UPDATE ON public.fiscal_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela principal de documentos NF-e
CREATE TABLE public.nfe_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id),
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','processando','autorizada','rejeitada','cancelada','erro','inutilizada')),
  numero TEXT,
  serie TEXT DEFAULT '1',
  chave_nfe TEXT,
  protocolo_autorizacao TEXT,
  ambiente TEXT DEFAULT 'homologacao',
  natureza_operacao TEXT DEFAULT 'Venda de mercadorias',
  tipo_operacao TEXT DEFAULT '1',
  finalidade_emissao TEXT DEFAULT '1',
  data_emissao TIMESTAMPTZ DEFAULT now(),
  data_entrada_saida TIMESTAMPTZ,
  -- Destinatário
  dest_nome TEXT,
  dest_cpf_cnpj TEXT,
  dest_inscricao_estadual TEXT,
  dest_telefone TEXT,
  dest_email TEXT,
  dest_logradouro TEXT,
  dest_numero TEXT,
  dest_complemento TEXT,
  dest_bairro TEXT,
  dest_cep TEXT,
  dest_municipio TEXT,
  dest_codigo_municipio TEXT,
  dest_uf TEXT,
  -- Totais
  valor_total NUMERIC(15,2) DEFAULT 0,
  valor_produtos NUMERIC(15,2) DEFAULT 0,
  valor_frete NUMERIC(15,2) DEFAULT 0,
  valor_seguro NUMERIC(15,2) DEFAULT 0,
  valor_desconto NUMERIC(15,2) DEFAULT 0,
  valor_outras NUMERIC(15,2) DEFAULT 0,
  -- Focus NFe
  focus_status TEXT,
  focus_code TEXT,
  focus_message TEXT,
  xml_url TEXT,
  pdf_url TEXT,
  payload_sent JSONB,
  payload_response JSONB,
  -- Observações
  informacoes_complementares TEXT,
  informacoes_fisco TEXT,
  -- Controle
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, reference)
);

ALTER TABLE public.nfe_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nfe_documents_select" ON public.nfe_documents FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "nfe_documents_insert" ON public.nfe_documents FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "nfe_documents_update" ON public.nfe_documents FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "nfe_documents_delete" ON public.nfe_documents FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER update_nfe_documents_updated_at
  BEFORE UPDATE ON public.nfe_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_nfe_documents_empresa ON public.nfe_documents(empresa_id);
CREATE INDEX idx_nfe_documents_status ON public.nfe_documents(status);
CREATE INDEX idx_nfe_documents_reference ON public.nfe_documents(reference);

-- Tabela de itens da NF-e
CREATE TABLE public.nfe_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nfe_id UUID NOT NULL REFERENCES public.nfe_documents(id) ON DELETE CASCADE,
  numero_item INTEGER NOT NULL DEFAULT 1,
  codigo_produto TEXT,
  descricao TEXT NOT NULL,
  ncm TEXT,
  cfop TEXT DEFAULT '5102',
  unidade TEXT DEFAULT 'UN',
  quantidade NUMERIC(15,4) DEFAULT 1,
  valor_unitario NUMERIC(15,4) DEFAULT 0,
  valor_total NUMERIC(15,2) DEFAULT 0,
  origem TEXT DEFAULT '0',
  cst_csosn TEXT DEFAULT '102',
  icms_aliquota NUMERIC(5,2) DEFAULT 0,
  icms_valor NUMERIC(15,2) DEFAULT 0,
  icms_base_calculo NUMERIC(15,2) DEFAULT 0,
  pis_cst TEXT DEFAULT '49',
  pis_aliquota NUMERIC(5,2) DEFAULT 0,
  pis_valor NUMERIC(15,2) DEFAULT 0,
  cofins_cst TEXT DEFAULT '49',
  cofins_aliquota NUMERIC(5,2) DEFAULT 0,
  cofins_valor NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nfe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nfe_items_select" ON public.nfe_items FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "nfe_items_insert" ON public.nfe_items FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "nfe_items_update" ON public.nfe_items FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "nfe_items_delete" ON public.nfe_items FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

-- Tabela de eventos/auditoria
CREATE TABLE public.nfe_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nfe_id UUID NOT NULL REFERENCES public.nfe_documents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  event_code TEXT,
  event_message TEXT,
  payload JSONB,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nfe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nfe_events_select" ON public.nfe_events FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "nfe_events_insert" ON public.nfe_events FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE INDEX idx_nfe_events_nfe ON public.nfe_events(nfe_id);

-- Tabela de logs de webhook
CREATE TABLE public.nfe_webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  reference TEXT,
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nfe_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Webhook logs: authenticated users read their own, anon can insert (webhook endpoint)
CREATE POLICY "nfe_webhook_logs_select" ON public.nfe_webhook_logs FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "nfe_webhook_logs_insert_auth" ON public.nfe_webhook_logs FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "nfe_webhook_logs_insert_anon" ON public.nfe_webhook_logs FOR INSERT TO anon
  WITH CHECK (true);

-- Tabela de rejeições
CREATE TABLE public.nfe_rejections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nfe_id UUID NOT NULL REFERENCES public.nfe_documents(id) ON DELETE CASCADE,
  rejection_code TEXT,
  rejection_message TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nfe_rejections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nfe_rejections_select" ON public.nfe_rejections FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "nfe_rejections_insert" ON public.nfe_rejections FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "nfe_rejections_update" ON public.nfe_rejections FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE INDEX idx_nfe_rejections_nfe ON public.nfe_rejections(nfe_id);
