
-- Add toggle to empresas
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS esteira_banho_ativa boolean NOT NULL DEFAULT false;

-- Create esteira_banho table
CREATE TABLE public.esteira_banho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  agendamento_id uuid NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  banhista_nome text,
  status text NOT NULL DEFAULT 'aguardando',
  inicio_at timestamptz,
  fim_at timestamptz,
  duracao_segundos integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.esteira_banho ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view esteira of their empresa"
  ON public.esteira_banho FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Users can insert esteira of their empresa"
  ON public.esteira_banho FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Users can update esteira of their empresa"
  ON public.esteira_banho FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Users can delete esteira of their empresa"
  ON public.esteira_banho FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE INDEX idx_esteira_banho_empresa ON public.esteira_banho(empresa_id);
CREATE INDEX idx_esteira_banho_agendamento ON public.esteira_banho(agendamento_id);
CREATE INDEX idx_esteira_banho_status ON public.esteira_banho(status);
