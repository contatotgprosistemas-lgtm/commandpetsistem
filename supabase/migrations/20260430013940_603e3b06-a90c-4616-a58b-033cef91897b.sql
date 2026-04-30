-- Tabela de configuração de notificação WhatsApp ao finalizar banho na esteira
CREATE TABLE IF NOT EXISTS public.esteira_notification_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  mensagem TEXT NOT NULL DEFAULT '🐾 Olá {primeiro_nome}! O *{servico}* do(a) *{pet}* foi finalizado! Pode vir buscar. 💙',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.esteira_notification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esteira_notif_select_own_empresa" ON public.esteira_notification_config
  FOR SELECT USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "esteira_notif_insert_own_empresa" ON public.esteira_notification_config
  FOR INSERT WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "esteira_notif_update_own_empresa" ON public.esteira_notification_config
  FOR UPDATE USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "esteira_notif_delete_own_empresa" ON public.esteira_notification_config
  FOR DELETE USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER trg_esteira_notification_config_updated_at
  BEFORE UPDATE ON public.esteira_notification_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Log de envios
CREATE TABLE IF NOT EXISTS public.esteira_notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  cliente_id UUID,
  esteira_id UUID,
  agendamento_id UUID,
  conversa_id UUID,
  status TEXT NOT NULL,
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.esteira_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esteira_notif_log_select_own_empresa" ON public.esteira_notification_log
  FOR SELECT USING (empresa_id = public.get_user_empresa_id());