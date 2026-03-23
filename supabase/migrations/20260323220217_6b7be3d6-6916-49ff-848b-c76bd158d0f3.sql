
-- Service Plans (planos mensais, recorrentes)
CREATE TABLE public.service_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'mensal',
  recurring_type TEXT DEFAULT 'mensal',
  price NUMERIC NOT NULL DEFAULT 0,
  validity_days INTEGER DEFAULT 30,
  auto_renew BOOLEAN DEFAULT false,
  rollover_enabled BOOLEAN DEFAULT false,
  min_loyalty_months INTEGER DEFAULT 0,
  cancellation_fee NUMERIC DEFAULT 0,
  pause_fee NUMERIC DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service Plan Items (serviços incluídos no plano)
CREATE TABLE public.service_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.service_plans(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  quantity_included INTEGER NOT NULL DEFAULT 1,
  usage_period TEXT DEFAULT 'mensal',
  extra_unit_price NUMERIC DEFAULT 0,
  limit_per_week INTEGER,
  limit_per_month INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service Packages (pacotes avulsos)
CREATE TABLE public.service_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  validity_days INTEGER DEFAULT 90,
  total_credits INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service Package Items
CREATE TABLE public.service_package_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  quantity_included INTEGER NOT NULL DEFAULT 1,
  extra_unit_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer Pet Subscriptions (contratações)
CREATE TABLE public.customer_pet_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.service_plans(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.service_packages(id) ON DELETE SET NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_renewal_date DATE,
  price_contracted NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  final_price NUMERIC NOT NULL DEFAULT 0,
  auto_renew BOOLEAN DEFAULT false,
  payment_method TEXT,
  sold_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscription Usage Logs
CREATE TABLE public.subscription_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.customer_pet_subscriptions(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES public.pets(id),
  service_name TEXT NOT NULL,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  quantity_used INTEGER NOT NULL DEFAULT 1,
  usage_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  was_extra BOOLEAN DEFAULT false,
  extra_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscription Events (timeline)
CREATE TABLE public.subscription_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.customer_pet_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for all tables
ALTER TABLE public.service_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_pet_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_plans
CREATE POLICY "Tenant isolation select" ON public.service_plans FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.service_plans FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.service_plans FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.service_plans FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- RLS policies for service_plan_items
CREATE POLICY "Tenant isolation select" ON public.service_plan_items FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.service_plan_items FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.service_plan_items FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.service_plan_items FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- RLS policies for service_packages
CREATE POLICY "Tenant isolation select" ON public.service_packages FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.service_packages FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.service_packages FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.service_packages FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- RLS policies for service_package_items
CREATE POLICY "Tenant isolation select" ON public.service_package_items FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.service_package_items FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.service_package_items FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.service_package_items FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- RLS policies for customer_pet_subscriptions
CREATE POLICY "Tenant isolation select" ON public.customer_pet_subscriptions FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.customer_pet_subscriptions FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.customer_pet_subscriptions FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.customer_pet_subscriptions FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Client sees own subscriptions" ON public.customer_pet_subscriptions FOR SELECT TO authenticated USING (cliente_id = get_user_cliente_id());

-- RLS policies for subscription_usage_logs
CREATE POLICY "Tenant isolation select" ON public.subscription_usage_logs FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.subscription_usage_logs FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.subscription_usage_logs FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.subscription_usage_logs FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- RLS policies for subscription_events
CREATE POLICY "Tenant isolation select" ON public.subscription_events FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.subscription_events FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.subscription_events FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());
