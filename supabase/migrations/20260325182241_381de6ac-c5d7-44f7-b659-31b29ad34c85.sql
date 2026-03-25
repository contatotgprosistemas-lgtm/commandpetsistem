
CREATE TABLE public.dados_fiscais_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT,
  inscricao_municipal TEXT,
  inscricao_estadual TEXT,
  regime_tributario TEXT DEFAULT 'simples_nacional',
  codigo_municipio TEXT,
  uf TEXT,
  endereco_logradouro TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cep TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id)
);

ALTER TABLE public.dados_fiscais_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own empresa fiscal data"
  ON public.dados_fiscais_empresa FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Users can insert own empresa fiscal data"
  ON public.dados_fiscais_empresa FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Users can update own empresa fiscal data"
  ON public.dados_fiscais_empresa FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE TABLE public.notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'nfse',
  referencia TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  numero TEXT,
  serie TEXT,
  chave_acesso TEXT,
  url_pdf TEXT,
  url_xml TEXT,
  cliente_id UUID REFERENCES public.clientes(id),
  cliente_nome TEXT,
  cliente_cpf_cnpj TEXT,
  descricao TEXT,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  dados_envio JSONB,
  resposta_api JSONB,
  mensagem_erro TEXT,
  agendamento_id UUID REFERENCES public.agendamentos(id),
  data_emissao TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own empresa notas"
  ON public.notas_fiscais FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Users can insert own empresa notas"
  ON public.notas_fiscais FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Users can update own empresa notas"
  ON public.notas_fiscais FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Users can delete own empresa notas"
  ON public.notas_fiscais FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER update_dados_fiscais_empresa_updated_at
  BEFORE UPDATE ON public.dados_fiscais_empresa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notas_fiscais_updated_at
  BEFORE UPDATE ON public.notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
