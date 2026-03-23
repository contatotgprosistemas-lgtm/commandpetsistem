ALTER TABLE public.contas_receber
  ADD COLUMN data_baixa date,
  ADD COLUMN banco text,
  ADD COLUMN valor_pago numeric,
  ADD COLUMN valor_juros numeric DEFAULT 0,
  ADD COLUMN valor_desconto numeric DEFAULT 0,
  ADD COLUMN observacao_baixa text;