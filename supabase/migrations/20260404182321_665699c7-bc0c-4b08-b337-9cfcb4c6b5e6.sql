
-- Add allows_replacement to service_plans
ALTER TABLE public.service_plans ADD COLUMN IF NOT EXISTS allows_replacement boolean NOT NULL DEFAULT false;

-- Create absences table
CREATE TABLE public.agendamento_absences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'sem_reposicao',
  atestado_url TEXT,
  admin_authorized_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agendamento_absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view absences from their company"
ON public.agendamento_absences FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Users can create absences for their company"
ON public.agendamento_absences FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Users can update absences from their company"
ON public.agendamento_absences FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id());

-- Also allow operational users via the operational empresa function
CREATE POLICY "Operational users can view absences"
ON public.agendamento_absences FOR SELECT TO authenticated
USING (empresa_id = public.get_operational_empresa_id());

CREATE POLICY "Operational users can create absences"
ON public.agendamento_absences FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_operational_empresa_id());
