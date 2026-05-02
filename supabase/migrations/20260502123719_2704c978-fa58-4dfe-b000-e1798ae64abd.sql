ALTER TABLE public.invoice_notification_config
  ADD COLUMN IF NOT EXISTS hora_geracao time NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS hora_pre_vencimento time NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS hora_vencimento time NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS hora_atraso time NOT NULL DEFAULT '09:00';