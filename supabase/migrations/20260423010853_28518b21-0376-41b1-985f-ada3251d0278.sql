
CREATE TABLE public.funil_estagios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'border-t-blue-500',
  ordem integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, key)
);

CREATE INDEX idx_funil_estagios_empresa ON public.funil_estagios(empresa_id, ordem);

ALTER TABLE public.funil_estagios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.funil_estagios
  FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.funil_estagios
  FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.funil_estagios
  FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.funil_estagios
  FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

CREATE TRIGGER update_funil_estagios_updated_at
  BEFORE UPDATE ON public.funil_estagios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default stages for existing companies
INSERT INTO public.funil_estagios (empresa_id, key, label, color, ordem, is_default)
SELECT e.id, v.key, v.label, v.color, v.ordem, true
FROM public.empresas e
CROSS JOIN (VALUES
  ('novo_lead', 'Novo Lead', 'border-t-blue-500', 1),
  ('contato_iniciado', 'Contato Iniciado', 'border-t-cyan-500', 2),
  ('qualificacao', 'Qualificação', 'border-t-amber-500', 3),
  ('proposta', 'Proposta', 'border-t-orange-500', 4),
  ('negociacao', 'Negociação', 'border-t-purple-500', 5),
  ('fechado_ganho', 'Fechado Ganho', 'border-t-emerald-500', 6),
  ('fechado_perdido', 'Fechado Perdido', 'border-t-red-500', 7)
) AS v(key, label, color, ordem)
ON CONFLICT (empresa_id, key) DO NOTHING;

-- Auto-seed for new companies
CREATE OR REPLACE FUNCTION public.seed_funil_estagios_for_empresa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.funil_estagios (empresa_id, key, label, color, ordem, is_default)
  VALUES
    (NEW.id, 'novo_lead', 'Novo Lead', 'border-t-blue-500', 1, true),
    (NEW.id, 'contato_iniciado', 'Contato Iniciado', 'border-t-cyan-500', 2, true),
    (NEW.id, 'qualificacao', 'Qualificação', 'border-t-amber-500', 3, true),
    (NEW.id, 'proposta', 'Proposta', 'border-t-orange-500', 4, true),
    (NEW.id, 'negociacao', 'Negociação', 'border-t-purple-500', 5, true),
    (NEW.id, 'fechado_ganho', 'Fechado Ganho', 'border-t-emerald-500', 6, true),
    (NEW.id, 'fechado_perdido', 'Fechado Perdido', 'border-t-red-500', 7, true)
  ON CONFLICT (empresa_id, key) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_funil_estagios
  AFTER INSERT ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.seed_funil_estagios_for_empresa();
