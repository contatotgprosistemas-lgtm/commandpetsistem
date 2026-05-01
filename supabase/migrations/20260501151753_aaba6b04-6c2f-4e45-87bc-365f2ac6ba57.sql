CREATE TABLE public.feriados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, data)
);

CREATE INDEX idx_feriados_empresa_data ON public.feriados (empresa_id, data);

ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa pode ver seus feriados"
ON public.feriados FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa pode criar feriados"
ON public.feriados FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa pode atualizar feriados"
ON public.feriados FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa pode remover feriados"
ON public.feriados FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER update_feriados_updated_at
BEFORE UPDATE ON public.feriados
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();