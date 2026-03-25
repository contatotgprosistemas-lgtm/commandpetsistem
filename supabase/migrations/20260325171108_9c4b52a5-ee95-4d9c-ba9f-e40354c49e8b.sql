
-- Contract templates
CREATE TABLE public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  content text NOT NULL,
  placeholders jsonb DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.contract_templates FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.contract_templates FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.contract_templates FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.contract_templates FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- Contracts
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.contract_templates(id),
  cliente_id uuid REFERENCES public.clientes(id),
  title text NOT NULL,
  content text NOT NULL,
  content_hash text,
  status text NOT NULL DEFAULT 'rascunho',
  signing_token uuid DEFAULT gen_random_uuid(),
  token_expires_at timestamptz,
  sent_at timestamptz,
  signed_at timestamptz,
  pdf_url text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.contracts FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.contracts FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.contracts FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.contracts FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Client sees own contracts" ON public.contracts FOR SELECT TO authenticated USING (cliente_id = get_user_cliente_id());
CREATE POLICY "Public token access" ON public.contracts FOR SELECT TO anon USING (signing_token IS NOT NULL AND token_expires_at > now());
CREATE POLICY "Anon can update on sign" ON public.contracts FOR UPDATE TO anon USING (signing_token IS NOT NULL AND token_expires_at > now());

-- Contract signatures (evidence)
CREATE TABLE public.contract_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  signer_name text NOT NULL,
  signer_email text,
  signer_document text,
  signer_ip text,
  signer_user_agent text,
  signer_device text,
  signer_latitude numeric,
  signer_longitude numeric,
  signature_image text,
  content_hash text NOT NULL,
  acceptance_text text NOT NULL DEFAULT 'Li e aceito os termos deste contrato',
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.contract_signatures FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.contract_signatures FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Client sees own sigs" ON public.contract_signatures FOR SELECT TO authenticated USING (contract_id IN (SELECT id FROM public.contracts WHERE cliente_id = get_user_cliente_id()));
CREATE POLICY "Anon can insert sig" ON public.contract_signatures FOR INSERT TO anon WITH CHECK (contract_id IN (SELECT id FROM public.contracts WHERE signing_token IS NOT NULL AND token_expires_at > now()));

-- Contract events (audit log)
CREATE TABLE public.contract_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.contract_events FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.contract_events FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Anon can insert event" ON public.contract_events FOR INSERT TO anon WITH CHECK (contract_id IN (SELECT id FROM public.contracts WHERE signing_token IS NOT NULL AND token_expires_at > now()));
