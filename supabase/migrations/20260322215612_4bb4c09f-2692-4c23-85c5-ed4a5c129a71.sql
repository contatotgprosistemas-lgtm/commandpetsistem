
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS data_entrada timestamp with time zone,
  ADD COLUMN IF NOT EXISTS hora_entrada text,
  ADD COLUMN IF NOT EXISTS data_saida_provavel timestamp with time zone,
  ADD COLUMN IF NOT EXISTS hora_saida_provavel text,
  ADD COLUMN IF NOT EXISTS data_saida timestamp with time zone,
  ADD COLUMN IF NOT EXISTS hora_saida text,
  ADD COLUMN IF NOT EXISTS baia text;
