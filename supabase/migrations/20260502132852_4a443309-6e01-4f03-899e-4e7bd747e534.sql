-- 1) Coluna metadata opcional para guardar referências cruzadas
ALTER TABLE public.invoice_notification_log
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 2) Índice único parcial: 1 envio por (empresa, cliente, tipo, dia)
-- Cobre tanto registros 'enviado' (sucesso confirmado) quanto 'enviando'
-- (lock em andamento). Falhas ('falha') não bloqueiam — permite retry.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_notif_unique_daily
  ON public.invoice_notification_log (empresa_id, cliente_id, tipo, ((enviado_em AT TIME ZONE 'America/Sao_Paulo')::date))
  WHERE status IN ('enviado','enviando');