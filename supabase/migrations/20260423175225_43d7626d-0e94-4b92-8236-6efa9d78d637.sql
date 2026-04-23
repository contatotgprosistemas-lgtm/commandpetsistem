-- Track when chatbot flow has been triggered for a conversation
-- to prevent re-triggering until the conversation is finalized.
ALTER TABLE public.conversas
  ADD COLUMN IF NOT EXISTS chatbot_flow_started_at timestamptz;

-- When a conversation is set back to a non-finalized state from finalized,
-- (or marked finalized) we want to allow the bot to start again on the next
-- new client message after finalization. We clear the marker when the
-- conversation status transitions to 'finalizado'.
CREATE OR REPLACE FUNCTION public.reset_chatbot_flow_on_finalize()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'finalizado' AND (OLD.status IS DISTINCT FROM 'finalizado') THEN
    NEW.chatbot_flow_started_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_chatbot_flow_on_finalize ON public.conversas;
CREATE TRIGGER trg_reset_chatbot_flow_on_finalize
BEFORE UPDATE ON public.conversas
FOR EACH ROW
EXECUTE FUNCTION public.reset_chatbot_flow_on_finalize();