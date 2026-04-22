ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS saldo_credito numeric NOT NULL DEFAULT 0;
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS checkout_obs text;