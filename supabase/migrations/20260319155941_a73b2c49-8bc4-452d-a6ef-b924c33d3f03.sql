ALTER TABLE public.clientes 
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS como_conheceu text;