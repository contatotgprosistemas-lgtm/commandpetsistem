ALTER TABLE public.feriados
ADD COLUMN IF NOT EXISTS data_fim DATE;

CREATE INDEX IF NOT EXISTS idx_feriados_periodo
ON public.feriados (empresa_id, data, data_fim);