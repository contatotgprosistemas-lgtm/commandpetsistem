
-- Motoristas
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  document TEXT,
  driver_license TEXT,
  driver_license_expiration DATE,
  status TEXT NOT NULL DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation select" ON public.drivers FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.drivers FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.drivers FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.drivers FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- Veículos
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  brand TEXT,
  model TEXT NOT NULL,
  plate TEXT,
  color TEXT,
  year INTEGER,
  capacity INTEGER NOT NULL DEFAULT 4,
  vehicle_type TEXT NOT NULL DEFAULT 'carro',
  status TEXT NOT NULL DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation select" ON public.vehicles FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.vehicles FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.vehicles FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- Endereços dos clientes
CREATE TABLE public.customer_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'casa',
  zip_code TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  reference TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation select" ON public.customer_addresses FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.customer_addresses FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.customer_addresses FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.customer_addresses FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- Tipos de transporte
CREATE TABLE public.transport_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation select" ON public.transport_types FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.transport_types FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.transport_types FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.transport_types FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- Agendamentos de transporte (corridas)
CREATE TABLE public.transport_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  transport_type_id UUID REFERENCES public.transport_types(id) ON DELETE SET NULL,
  related_service_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  pickup_address_id UUID REFERENCES public.customer_addresses(id) ON DELETE SET NULL,
  dropoff_address_id UUID REFERENCES public.customer_addresses(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  recurring_rule_id UUID,
  scheduled_date DATE NOT NULL,
  scheduled_pickup_time TIME,
  scheduled_dropoff_time TIME,
  actual_pickup_time TIMESTAMPTZ,
  actual_dropoff_time TIMESTAMPTZ,
  trip_type TEXT NOT NULL DEFAULT 'ida_volta',
  status TEXT NOT NULL DEFAULT 'agendada',
  notes TEXT,
  special_instructions TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  extra_fee NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  final_price NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pendente',
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation select" ON public.transport_bookings FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.transport_bookings FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.transport_bookings FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.transport_bookings FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- Regras de recorrência
CREATE TABLE public.transport_recurring_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  transport_type_id UUID REFERENCES public.transport_types(id) ON DELETE SET NULL,
  pickup_address_id UUID REFERENCES public.customer_addresses(id) ON DELETE SET NULL,
  dropoff_address_id UUID REFERENCES public.customer_addresses(id) ON DELETE SET NULL,
  preferred_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  preferred_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  weekdays INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  pickup_time TIME,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_recurring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation select" ON public.transport_recurring_rules FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.transport_recurring_rules FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.transport_recurring_rules FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.transport_recurring_rules FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- Adicionar FK de recurring_rule_id
ALTER TABLE public.transport_bookings ADD CONSTRAINT transport_bookings_recurring_rule_id_fkey FOREIGN KEY (recurring_rule_id) REFERENCES public.transport_recurring_rules(id) ON DELETE SET NULL;

-- Itens de rota
CREATE TABLE public.transport_route_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  route_date DATE NOT NULL,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  booking_id UUID NOT NULL REFERENCES public.transport_bookings(id) ON DELETE CASCADE,
  route_order INTEGER NOT NULL DEFAULT 0,
  estimated_time TIME,
  actual_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_route_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation select" ON public.transport_route_items FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.transport_route_items FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.transport_route_items FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.transport_route_items FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- Eventos de transporte (timeline)
CREATE TABLE public.transport_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.transport_bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation select" ON public.transport_events FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.transport_events FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.transport_events FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());
