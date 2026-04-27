ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS assinatura_url text,
ADD COLUMN IF NOT EXISTS assinatura_responsavel text;