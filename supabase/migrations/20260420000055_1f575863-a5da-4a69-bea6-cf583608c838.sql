ALTER TABLE public.contas_receber
ADD COLUMN IF NOT EXISTS asaas_conta_id uuid REFERENCES public.asaas_contas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contas_receber_asaas_conta_id
ON public.contas_receber(asaas_conta_id);