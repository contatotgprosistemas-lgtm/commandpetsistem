
-- Add hora_prevista_buscar and hora_prevista_levar to agendamentos for TaxiPet scheduling
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS hora_prevista_buscar text;
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS hora_prevista_levar text;

-- RLS for client to see own transport_bookings
ALTER TABLE public.transport_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client sees own transport_bookings"
  ON public.transport_bookings FOR SELECT TO authenticated
  USING (cliente_id = get_user_cliente_id());

-- RLS for client to see own transport_events
ALTER TABLE public.transport_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client sees own transport_events"
  ON public.transport_events FOR SELECT TO authenticated
  USING (booking_id IN (SELECT id FROM public.transport_bookings WHERE cliente_id = get_user_cliente_id()));
