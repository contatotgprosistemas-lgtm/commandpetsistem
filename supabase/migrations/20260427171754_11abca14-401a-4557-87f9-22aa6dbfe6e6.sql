
CREATE TABLE IF NOT EXISTS public.invoice_notification_config (
  empresa_id uuid PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  mensagem text NOT NULL DEFAULT 'Olá {nome}! 👋\n\nUma nova fatura foi gerada para você:\n\n📄 *{descricao}*\n💰 Valor: *R$ {valor}*\n📅 Vencimento: *{vencimento}*\n\nQualquer dúvida, estamos à disposição. 🐾',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_notification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa manage own invoice notif config"
ON public.invoice_notification_config
FOR ALL
TO authenticated
USING (empresa_id = public.get_user_empresa_id())
WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER trg_inv_notif_config_updated
BEFORE UPDATE ON public.invoice_notification_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.invoice_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid,
  conta_receber_id uuid,
  conversa_id uuid,
  status text NOT NULL DEFAULT 'enviado',
  erro text,
  enviado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_notif_log_empresa ON public.invoice_notification_log(empresa_id, enviado_em DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inv_notif_log_conta ON public.invoice_notification_log(conta_receber_id) WHERE conta_receber_id IS NOT NULL AND status = 'enviado';

ALTER TABLE public.invoice_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa view own invoice notif log"
ON public.invoice_notification_log
FOR SELECT
TO authenticated
USING (empresa_id = public.get_user_empresa_id());
