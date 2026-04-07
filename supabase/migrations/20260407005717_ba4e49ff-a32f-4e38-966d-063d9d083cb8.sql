
ALTER TABLE public.agendamento_absences
  ADD COLUMN reposicao_utilizada boolean NOT NULL DEFAULT false,
  ADD COLUMN reposicao_agendamento_id uuid REFERENCES public.agendamentos(id) ON DELETE SET NULL;
