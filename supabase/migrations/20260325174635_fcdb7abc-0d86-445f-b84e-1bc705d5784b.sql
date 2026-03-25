
CREATE TABLE public.tipos_servico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tipos_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company service types"
  ON public.tipos_servico FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert service types for their company"
  ON public.tipos_servico FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company service types"
  ON public.tipos_servico FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their company service types"
  ON public.tipos_servico FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE user_id = auth.uid()));
