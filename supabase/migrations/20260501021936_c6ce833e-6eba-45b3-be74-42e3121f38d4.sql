ALTER TABLE public.metas_faturamento
  ADD COLUMN IF NOT EXISTS realizado_manual NUMERIC;