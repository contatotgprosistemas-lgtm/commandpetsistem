ALTER TABLE public.servicos ADD COLUMN considerar_dia boolean NOT NULL DEFAULT false;
ALTER TABLE public.servicos ADD COLUMN diaria_24h boolean NOT NULL DEFAULT false;