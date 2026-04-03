ALTER TABLE public.empresas
  ADD COLUMN horario_semana_inicio text DEFAULT '08:00',
  ADD COLUMN horario_semana_fim text DEFAULT '18:00',
  ADD COLUMN horario_sabado_inicio text,
  ADD COLUMN horario_sabado_fim text,
  ADD COLUMN horario_domingo_inicio text,
  ADD COLUMN horario_domingo_fim text,
  ADD COLUMN cep text,
  ADD COLUMN endereco_numero text;

ALTER TABLE public.empresas DROP COLUMN IF EXISTS horario_funcionamento;