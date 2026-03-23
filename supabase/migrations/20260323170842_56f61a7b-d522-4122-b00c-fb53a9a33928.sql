
-- Add user_id to clientes to link client auth accounts
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS clientes_user_id_unique ON public.clientes(user_id) WHERE user_id IS NOT NULL;

-- Add 'cliente' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cliente';

-- Customer notifications
CREATE TABLE public.customer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'sistema',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

-- Customer documents
CREATE TABLE public.customer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL,
  type text NOT NULL DEFAULT 'documento',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

-- Customer requests / chamados
CREATE TABLE public.customer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'aberto',
  priority text NOT NULL DEFAULT 'media',
  assigned_user_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_requests ENABLE ROW LEVEL SECURITY;

-- Function to get cliente_id for current user
CREATE OR REPLACE FUNCTION public.get_user_cliente_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clientes WHERE user_id = auth.uid() LIMIT 1
$$;

-- RLS: clients can only see their own notifications
CREATE POLICY "Client sees own notifications" ON public.customer_notifications
  FOR SELECT TO authenticated USING (cliente_id = get_user_cliente_id());
CREATE POLICY "Client marks own notifications read" ON public.customer_notifications
  FOR UPDATE TO authenticated USING (cliente_id = get_user_cliente_id());
CREATE POLICY "Tenant insert notifications" ON public.customer_notifications
  FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant manage notifications" ON public.customer_notifications
  FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant select notifications" ON public.customer_notifications
  FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());

-- RLS: clients can only see their own documents
CREATE POLICY "Client sees own documents" ON public.customer_documents
  FOR SELECT TO authenticated USING (cliente_id = get_user_cliente_id());
CREATE POLICY "Tenant insert documents" ON public.customer_documents
  FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant manage documents" ON public.customer_documents
  FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant select documents" ON public.customer_documents
  FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());

-- RLS: clients can see/create their own requests
CREATE POLICY "Client sees own requests" ON public.customer_requests
  FOR SELECT TO authenticated USING (cliente_id = get_user_cliente_id());
CREATE POLICY "Client creates request" ON public.customer_requests
  FOR INSERT TO authenticated WITH CHECK (cliente_id = get_user_cliente_id());
CREATE POLICY "Client updates own request" ON public.customer_requests
  FOR UPDATE TO authenticated USING (cliente_id = get_user_cliente_id());
CREATE POLICY "Tenant manage requests" ON public.customer_requests
  FOR ALL TO authenticated USING (empresa_id = get_user_empresa_id()) WITH CHECK (empresa_id = get_user_empresa_id());

-- RLS: client can see own clientes record
CREATE POLICY "Client sees own record" ON public.clientes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Client updates own record" ON public.clientes
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- RLS: client can see own pets
CREATE POLICY "Client sees own pets" ON public.pets
  FOR SELECT TO authenticated USING (cliente_id = get_user_cliente_id());

-- RLS: client can see own agendamentos
CREATE POLICY "Client sees own agendamentos" ON public.agendamentos
  FOR SELECT TO authenticated USING (cliente_id = get_user_cliente_id());

-- RLS: client can see own contas_receber
CREATE POLICY "Client sees own invoices" ON public.contas_receber
  FOR SELECT TO authenticated USING (cliente_id = get_user_cliente_id());

-- RLS: client can see own conversas
CREATE POLICY "Client sees own conversas" ON public.conversas
  FOR SELECT TO authenticated USING (cliente_id = get_user_cliente_id());

-- RLS: client can see own historico_servicos
CREATE POLICY "Client sees own history" ON public.historico_servicos
  FOR SELECT TO authenticated USING (cliente_id = get_user_cliente_id());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notifications;
