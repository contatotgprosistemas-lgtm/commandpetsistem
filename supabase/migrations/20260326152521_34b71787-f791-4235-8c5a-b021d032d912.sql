
-- Tags table for conversation tags
CREATE TABLE public.conversation_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.conversation_tags FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.conversation_tags FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.conversation_tags FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.conversation_tags FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- Junction table linking tags to conversations
CREATE TABLE public.conversa_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.conversation_tags(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversa_id, tag_id)
);

ALTER TABLE public.conversa_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.conversa_tags FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.conversa_tags FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.conversa_tags FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());
