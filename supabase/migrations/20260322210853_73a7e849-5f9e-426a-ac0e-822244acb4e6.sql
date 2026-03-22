
-- Table: quick_replies
CREATE TABLE public.quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  shortcut TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.quick_replies FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.quick_replies FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.quick_replies FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.quick_replies FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- Table: contact_tasks
CREATE TABLE public.contact_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  assigned_user_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.contact_tasks FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.contact_tasks FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.contact_tasks FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.contact_tasks FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());
