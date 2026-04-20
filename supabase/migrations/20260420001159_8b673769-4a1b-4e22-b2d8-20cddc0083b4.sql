ALTER TABLE public.movimentacoes
DROP CONSTRAINT IF EXISTS movimentacoes_conta_bancaria_id_fkey;

ALTER TABLE public.movimentacoes
ADD CONSTRAINT movimentacoes_conta_bancaria_id_fkey
FOREIGN KEY (conta_bancaria_id) REFERENCES public.contas_bancarias(id) ON DELETE SET NULL;