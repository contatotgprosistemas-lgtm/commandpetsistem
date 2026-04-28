
CREATE TABLE public.tipo_servico_perguntas_manejo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  tipo_servico_id UUID NOT NULL REFERENCES public.tipos_servico(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'sim_nao',
  opcoes JSONB DEFAULT '[]'::jsonb,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tipo_servico_perguntas_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  tipo_servico_id UUID NOT NULL REFERENCES public.tipos_servico(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tipo_servico_perguntas_manejo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_servico_perguntas_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa pode ver perguntas manejo"
  ON public.tipo_servico_perguntas_manejo FOR SELECT
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa pode inserir perguntas manejo"
  ON public.tipo_servico_perguntas_manejo FOR INSERT
  WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa pode atualizar perguntas manejo"
  ON public.tipo_servico_perguntas_manejo FOR UPDATE
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa pode excluir perguntas manejo"
  ON public.tipo_servico_perguntas_manejo FOR DELETE
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa pode ver perguntas checklist"
  ON public.tipo_servico_perguntas_checklist FOR SELECT
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa pode inserir perguntas checklist"
  ON public.tipo_servico_perguntas_checklist FOR INSERT
  WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa pode atualizar perguntas checklist"
  ON public.tipo_servico_perguntas_checklist FOR UPDATE
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Empresa pode excluir perguntas checklist"
  ON public.tipo_servico_perguntas_checklist FOR DELETE
  USING (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER trg_perguntas_manejo_updated
  BEFORE UPDATE ON public.tipo_servico_perguntas_manejo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_perguntas_checklist_updated
  BEFORE UPDATE ON public.tipo_servico_perguntas_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_perguntas_manejo_tipo ON public.tipo_servico_perguntas_manejo(tipo_servico_id);
CREATE INDEX idx_perguntas_checklist_tipo ON public.tipo_servico_perguntas_checklist(tipo_servico_id);
