ALTER TABLE public.ponto_configuracoes
  ADD COLUMN IF NOT EXISTS horario_entrada time DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS horario_pausa time DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS horario_retorno time DEFAULT '13:00',
  ADD COLUMN IF NOT EXISTS horario_saida time DEFAULT '17:00';