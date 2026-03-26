
-- Add nome column to ponto_configuracoes to identify each journey
ALTER TABLE public.ponto_configuracoes ADD COLUMN nome text NOT NULL DEFAULT 'Jornada Padrão';

-- Add jornada_id to operational_users to link employee to a specific journey
ALTER TABLE public.operational_users ADD COLUMN jornada_id uuid REFERENCES public.ponto_configuracoes(id) ON DELETE SET NULL;
