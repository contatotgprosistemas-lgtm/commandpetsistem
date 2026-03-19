ALTER TABLE public.pets 
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS pelagem text,
  ADD COLUMN IF NOT EXISTS antiparasitario_data date,
  ADD COLUMN IF NOT EXISTS v10_data date,
  ADD COLUMN IF NOT EXISTS raiva_data date;