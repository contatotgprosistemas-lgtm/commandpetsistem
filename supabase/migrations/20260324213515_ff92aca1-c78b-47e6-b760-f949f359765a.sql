
-- Add transport_booking_id to contas_receber to link invoices to TaxiPet bookings
ALTER TABLE public.contas_receber 
ADD COLUMN transport_booking_id uuid REFERENCES public.transport_bookings(id) ON DELETE SET NULL;

-- Create trigger function to sync payment_status on transport_bookings when contas_receber is updated
CREATE OR REPLACE FUNCTION public.sync_taxipet_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a contas_receber linked to a transport_booking changes status
  IF NEW.transport_booking_id IS NOT NULL AND 
     (OLD.status IS DISTINCT FROM NEW.status) THEN
    
    IF NEW.status = 'pago' THEN
      UPDATE public.transport_bookings
      SET payment_status = 'pago', updated_at = now()
      WHERE id = NEW.transport_booking_id;
    ELSIF NEW.status = 'pendente' THEN
      UPDATE public.transport_bookings
      SET payment_status = 'pendente', updated_at = now()
      WHERE id = NEW.transport_booking_id;
    ELSIF NEW.status = 'vencido' THEN
      UPDATE public.transport_bookings
      SET payment_status = 'vencido', updated_at = now()
      WHERE id = NEW.transport_booking_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to contas_receber
CREATE TRIGGER trg_sync_taxipet_payment
AFTER UPDATE ON public.contas_receber
FOR EACH ROW
EXECUTE FUNCTION public.sync_taxipet_payment_status();
