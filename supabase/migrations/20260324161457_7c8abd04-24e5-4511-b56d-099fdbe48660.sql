
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS asaas_payment_id text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS asaas_customer_id text;
