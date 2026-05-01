-- Extend invoice_notification_config with per-event templates and cadence
ALTER TABLE public.invoice_notification_config
  ADD COLUMN IF NOT EXISTS enabled_geracao boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mensagem_geracao text,
  ADD COLUMN IF NOT EXISTS enabled_pre_vencimento boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mensagem_pre_vencimento text,
  ADD COLUMN IF NOT EXISTS dias_antes integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS enabled_vencimento boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mensagem_vencimento text,
  ADD COLUMN IF NOT EXISTS enabled_atraso boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mensagem_atraso text,
  ADD COLUMN IF NOT EXISTS dias_apos integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS intervalo_entre_envios_seg integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS max_envios_por_minuto integer NOT NULL DEFAULT 6;

-- Defaults for existing/new templates (only when null)
UPDATE public.invoice_notification_config
SET mensagem_geracao = COALESCE(mensagem_geracao, mensagem,
  'Olá {nome}! 👋

Uma nova fatura foi gerada para você:

📄 *{descricao}*
💰 Valor: *R$ {valor}*
📅 Vencimento: *{vencimento}*

Qualquer dúvida, estamos à disposição. 🐾'),
  mensagem_pre_vencimento = COALESCE(mensagem_pre_vencimento,
  'Olá {primeiro_nome}! 👋

Passando para lembrar que sua fatura *{descricao}* no valor de *R$ {valor}* vence em *{vencimento}* (em {dias_restantes} dias).

Qualquer dúvida, estamos por aqui. 🐾'),
  mensagem_vencimento = COALESCE(mensagem_vencimento,
  'Olá {primeiro_nome}!

Sua fatura *{descricao}* no valor de *R$ {valor}* vence *hoje ({vencimento})*.

Caso já tenha efetuado o pagamento, por favor desconsidere. 🐾'),
  mensagem_atraso = COALESCE(mensagem_atraso,
  'Olá {primeiro_nome},

Identificamos que sua fatura *{descricao}* de *R$ {valor}*, com vencimento em {vencimento}, está em atraso há {dias_atraso} dias.

Por favor, regularize quando possível ou entre em contato conosco. 🐾');

-- Add tipo to log
ALTER TABLE public.invoice_notification_log
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'geracao';

-- Idempotency: never send the same event twice (only when enviado)
CREATE UNIQUE INDEX IF NOT EXISTS invoice_notification_log_tipo_unique
  ON public.invoice_notification_log (empresa_id, conta_receber_id, tipo)
  WHERE status = 'enviado' AND conta_receber_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS invoice_notification_log_tipo_idx
  ON public.invoice_notification_log (empresa_id, tipo, status, enviado_em DESC);