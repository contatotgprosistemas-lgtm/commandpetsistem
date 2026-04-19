
-- Drop Focus NFe legacy tables
DROP TABLE IF EXISTS public.nfe_rejections CASCADE;
DROP TABLE IF EXISTS public.nfe_webhook_logs CASCADE;
DROP TABLE IF EXISTS public.nfe_events CASCADE;
DROP TABLE IF EXISTS public.nfe_items CASCADE;
DROP TABLE IF EXISTS public.nfe_documents CASCADE;
DROP TABLE IF EXISTS public.fiscal_settings CASCADE;

-- Asaas NFS-e configuration per empresa
CREATE TABLE public.asaas_nfse_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  asaas_conta_id UUID REFERENCES public.asaas_contas(id) ON DELETE SET NULL,
  municipio_codigo_ibge TEXT,
  municipio_nome TEXT,
  uf TEXT,
  aliquota_iss NUMERIC(5,2) DEFAULT 0,
  item_lista_servico TEXT,
  codigo_servico_municipio TEXT,
  cnae TEXT,
  descricao_servico_padrao TEXT DEFAULT 'Prestação de serviços',
  rps_serie TEXT DEFAULT '1',
  rps_proximo_numero INTEGER DEFAULT 1,
  iss_retido BOOLEAN DEFAULT false,
  observacoes TEXT,
  emitir_automaticamente BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.asaas_nfse_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asaas_nfse_config_select" ON public.asaas_nfse_config
  FOR SELECT USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "asaas_nfse_config_insert" ON public.asaas_nfse_config
  FOR INSERT WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "asaas_nfse_config_update" ON public.asaas_nfse_config
  FOR UPDATE USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "asaas_nfse_config_delete" ON public.asaas_nfse_config
  FOR DELETE USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER update_asaas_nfse_config_updated_at
  BEFORE UPDATE ON public.asaas_nfse_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NFS-e documents emitted via Asaas
CREATE TABLE public.asaas_nfse_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  conta_receber_id UUID REFERENCES public.contas_receber(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  asaas_nfse_id TEXT,
  asaas_payment_id TEXT,
  numero TEXT,
  serie TEXT,
  codigo_verificacao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  valor_servico NUMERIC(12,2) NOT NULL DEFAULT 0,
  aliquota_iss NUMERIC(5,2) DEFAULT 0,
  valor_iss NUMERIC(12,2) DEFAULT 0,
  descricao TEXT,
  data_emissao TIMESTAMPTZ,
  data_cancelamento TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  pdf_url TEXT,
  xml_url TEXT,
  link_visualizacao TEXT,
  tomador_nome TEXT,
  tomador_cpf_cnpj TEXT,
  tomador_email TEXT,
  erro_mensagem TEXT,
  payload_envio JSONB,
  payload_resposta JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asaas_nfse_docs_empresa ON public.asaas_nfse_documents(empresa_id);
CREATE INDEX idx_asaas_nfse_docs_conta_receber ON public.asaas_nfse_documents(conta_receber_id);
CREATE INDEX idx_asaas_nfse_docs_status ON public.asaas_nfse_documents(status);

ALTER TABLE public.asaas_nfse_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asaas_nfse_docs_select" ON public.asaas_nfse_documents
  FOR SELECT USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "asaas_nfse_docs_insert" ON public.asaas_nfse_documents
  FOR INSERT WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "asaas_nfse_docs_update" ON public.asaas_nfse_documents
  FOR UPDATE USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "asaas_nfse_docs_delete" ON public.asaas_nfse_documents
  FOR DELETE USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER update_asaas_nfse_docs_updated_at
  BEFORE UPDATE ON public.asaas_nfse_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
