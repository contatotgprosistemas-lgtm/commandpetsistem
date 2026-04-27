
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS origem_cadastro text,
  ADD COLUMN IF NOT EXISTS notificacao_cadastro_dispensada boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_clientes_origem_notif
  ON public.clientes (empresa_id, origem_cadastro, notificacao_cadastro_dispensada)
  WHERE deleted_at IS NULL;
