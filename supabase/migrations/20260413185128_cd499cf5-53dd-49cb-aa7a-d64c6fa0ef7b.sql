ALTER TABLE public.clientes ALTER COLUMN dia_vencimento_fatura DROP NOT NULL;
ALTER TABLE public.clientes ALTER COLUMN dia_vencimento_fatura SET DEFAULT NULL;