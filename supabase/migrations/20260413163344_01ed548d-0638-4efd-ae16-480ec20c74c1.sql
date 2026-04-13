
CREATE TABLE public.baias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tamanho TEXT NOT NULL DEFAULT '',
  capacidade_pets INTEGER NOT NULL DEFAULT 1,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.baias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver baias da sua empresa"
ON public.baias FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Usuários autenticados podem criar baias da sua empresa"
ON public.baias FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Usuários autenticados podem editar baias da sua empresa"
ON public.baias FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Usuários autenticados podem excluir baias da sua empresa"
ON public.baias FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id());
