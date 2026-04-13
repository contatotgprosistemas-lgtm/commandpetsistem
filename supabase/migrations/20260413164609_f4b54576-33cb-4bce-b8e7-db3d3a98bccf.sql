
CREATE TABLE public.contas_receber_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_receber_id UUID NOT NULL REFERENCES public.contas_receber(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'principal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contas_receber_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver itens da sua empresa"
ON public.contas_receber_itens FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Usuários podem criar itens da sua empresa"
ON public.contas_receber_itens FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Usuários podem excluir itens da sua empresa"
ON public.contas_receber_itens FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE INDEX idx_contas_receber_itens_conta ON public.contas_receber_itens(conta_receber_id);
