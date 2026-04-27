ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS edit_token uuid DEFAULT gen_random_uuid();
UPDATE public.clientes SET edit_token = gen_random_uuid() WHERE edit_token IS NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_edit_token ON public.clientes(edit_token);