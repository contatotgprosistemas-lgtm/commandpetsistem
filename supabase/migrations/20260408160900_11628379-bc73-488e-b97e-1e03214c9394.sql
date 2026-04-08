
CREATE TABLE public.formas_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa members can view formas_pagamento"
  ON public.formas_pagamento FOR SELECT
  TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa members can insert formas_pagamento"
  ON public.formas_pagamento FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa members can update formas_pagamento"
  ON public.formas_pagamento FOR UPDATE
  TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa members can delete formas_pagamento"
  ON public.formas_pagamento FOR DELETE
  TO authenticated
  USING (empresa_id = public.get_user_empresa_id());
