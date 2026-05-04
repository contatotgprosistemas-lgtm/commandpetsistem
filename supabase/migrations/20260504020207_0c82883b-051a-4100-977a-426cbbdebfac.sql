
-- 1) Lock down short_links
DROP POLICY IF EXISTS "Anyone can read short_links" ON public.short_links;
DROP POLICY IF EXISTS "Authenticated users can insert short_links" ON public.short_links;

-- Authenticated users see only their own empresa links
CREATE POLICY "Empresa can read own short_links"
ON public.short_links FOR SELECT
TO authenticated
USING (empresa_id = public.get_user_empresa_id());

-- Authenticated users insert only into their own empresa
CREATE POLICY "Empresa can insert short_links"
ON public.short_links FOR INSERT
TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id());

-- 2) Private secrets table for Evolution API keys
CREATE TABLE IF NOT EXISTS public.crm_canal_secrets (
  canal_id uuid PRIMARY KEY REFERENCES public.crm_canais(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  api_key text NOT NULL,
  server_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_canal_secrets ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE for any role from the API (service role bypasses RLS).
-- Edge functions using SUPABASE_SERVICE_ROLE_KEY can read/write; clients cannot.
REVOKE ALL ON public.crm_canal_secrets FROM anon, authenticated;

-- 3) Migrate existing api_keys out of config JSONB
INSERT INTO public.crm_canal_secrets (canal_id, empresa_id, api_key, server_url)
SELECT id, empresa_id,
       (config->>'api_key')::text,
       (config->>'server_url')::text
FROM public.crm_canais
WHERE config ? 'api_key' AND (config->>'api_key') IS NOT NULL AND (config->>'api_key') <> ''
ON CONFLICT (canal_id) DO NOTHING;

-- Strip the api_key from the JSON column so atendentes can't read it via crm_canais SELECT
UPDATE public.crm_canais
SET config = config - 'api_key'
WHERE config ? 'api_key';
