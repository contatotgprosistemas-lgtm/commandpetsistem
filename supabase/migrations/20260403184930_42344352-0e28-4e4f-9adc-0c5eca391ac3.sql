ALTER TABLE public.clientes
  ADD COLUMN dia_vencimento_fatura integer NOT NULL DEFAULT 10,
  ADD COLUMN dias_gerar_fatura integer NOT NULL DEFAULT 5;