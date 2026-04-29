-- Trigger: when an appointment goes to na_empresa or concluido, auto-deactivate
-- active "Estou Chegando" sessions for that client + company.
CREATE OR REPLACE FUNCTION public.deactivate_estou_chegando_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('na_empresa', 'concluido')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.estou_chegando
    SET active = false, updated_at = now()
    WHERE cliente_id = NEW.cliente_id
      AND empresa_id = NEW.empresa_id
      AND active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deactivate_estou_chegando ON public.agendamentos;
CREATE TRIGGER trg_deactivate_estou_chegando
AFTER UPDATE OF status ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.deactivate_estou_chegando_on_status_change();

-- Helper RPC for the cleanup edge function (or cron) to deactivate stale sessions.
CREATE OR REPLACE FUNCTION public.cleanup_estou_chegando_stale(p_hours integer DEFAULT 2)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.estou_chegando
    SET active = false, updated_at = now()
    WHERE active = true
      AND created_at < now() - make_interval(hours => p_hours)
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$$;